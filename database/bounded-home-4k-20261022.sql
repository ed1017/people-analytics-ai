BEGIN;
SET LOCAL statement_timeout='15s';
DO $bounded$
DECLARE before_meta jsonb; after_meta jsonb; before_rows jsonb:='{}'; after_rows jsonb:='{}'; t record; h text;
BEGIN
 PERFORM set_config('lock_timeout','3s',true);
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND cap_micro_usd=20000000 AND enabled AND policy_id='planner-20261020-multiprice-v1' AND per_call_micro_usd=4800000 AND pricing_valid_until='2026-10-22T22:51:00Z'::timestamptz FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Reviewed rollout baseline changed'; END IF;
 IF md5(pg_get_functiondef('public.reserve_public_ai(text,text,text,bigint)'::regprocedure))<>'917752a853ea57d9952374829a246584' THEN RAISE EXCEPTION 'Reviewed reserve_public_ai baseline changed'; END IF;
 IF md5(pg_get_functiondef('public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure))<>'55457f5763c00b2295eff313557a9e92' THEN RAISE EXCEPTION 'Reviewed settle_public_ai_call baseline changed'; END IF;
 SELECT jsonb_agg(to_jsonb(p)-'prosrc' ORDER BY p.proname) INTO before_meta FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('reserve_public_ai','settle_public_ai_call');
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public_ai_budget' AND c.relkind='r' LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text, %L ORDER BY to_jsonb(r)::text), %L)) FROM public_ai_budget.%I r','','',t.relname) INTO h;
  before_rows:=before_rows||jsonb_build_object(t.relname,h);
 END LOOP;
 EXECUTE $definition$
CREATE OR REPLACE FUNCTION public.reserve_public_ai(p_request_id text, p_context_id text, p_policy_id text, p_reserve_micro_usd bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog'
AS $function$
 DECLARE b public_ai_budget.rollout%ROWTYPE; charge bigint; used numeric;
 BEGIN
  IF p_request_id IS NULL OR p_request_id !~ '^[a-zA-Z0-9_-]{12,80}$'
  OR p_context_id IS NULL OR p_context_id !~ '^[a-f0-9]{64}$'
  OR p_policy_id IS NULL OR p_policy_id !~ '^[a-zA-Z0-9_-]{1,80}$'
  OR p_reserve_micro_usd IS NULL THEN
   RETURN jsonb_build_object('granted',false);
  END IF;
  SELECT * INTO b FROM public_ai_budget.rollout
  WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
  IF NOT FOUND OR NOT b.enabled OR b.pricing_valid_until IS NULL
  OR b.pricing_valid_until <= clock_timestamp()+interval '30 seconds' THEN
   RETURN jsonb_build_object('granted',false);
  END IF;
  IF b.policy_id='planner-20261020-multiprice-v1' THEN
   -- Exact reviewed policy/price pairs; never accept an arbitrary lower charge.
   charge:=CASE p_policy_id
    WHEN 'planner-sol-20261020-v1' THEN 4800000
    WHEN 'planner-sol-4k-20261022-v1' THEN 4686000
    WHEN 'planner-luna-20261020-v1' THEN 500000
    ELSE NULL END;
   IF b.per_call_micro_usd IS DISTINCT FROM 4800000
   OR b.pricing_valid_until>'2026-10-22T22:51:00Z'::timestamptz
   OR charge IS NULL OR p_reserve_micro_usd IS DISTINCT FROM charge THEN
    RETURN jsonb_build_object('granted',false);
   END IF;
  ELSE
   -- Preserve existing single-price policy behavior.
   IF b.policy_id IS DISTINCT FROM p_policy_id
   OR b.per_call_micro_usd IS DISTINCT FROM p_reserve_micro_usd THEN
    RETURN jsonb_build_object('granted',false);
   END IF;
   charge:=b.per_call_micro_usd;
  END IF;
  SELECT b.reserved_micro_usd - coalesce((SELECT sum(reserved_micro_usd-charged_micro_usd) FROM public_ai_budget.settlement_group),0) + coalesce((SELECT sum(amount_micro_usd) FROM public_ai_budget.settlement_debit),0) INTO used;
  IF b.reserved_micro_usd IS DISTINCT FROM (SELECT sum(reserved_micro_usd) FROM public_ai_budget.reservation)
  OR used<0 OR EXISTS(SELECT 1 FROM public_ai_budget.settlement_debit WHERE halt_admission)
  OR charge IS NULL OR charge<=0 OR charge>5000000
  OR used+charge>b.cap_micro_usd OR b.reserved_micro_usd::numeric+charge>9223372036854775807 THEN
   RETURN jsonb_build_object('granted',false);
  END IF;
  IF EXISTS (SELECT 1 FROM public_ai_budget.reservation WHERE request_id=p_request_id) THEN
   RETURN jsonb_build_object('granted',false);
  END IF;
  INSERT INTO public_ai_budget.reservation(request_id,context_id,policy_id,reserved_micro_usd)
  VALUES(p_request_id,p_context_id,p_policy_id,charge);
  UPDATE public_ai_budget.rollout SET reserved_micro_usd=reserved_micro_usd+charge
  WHERE id=b.id;
  RETURN jsonb_build_object('granted',true,'requestId',p_request_id,'contextId',p_context_id,
   'policyId',p_policy_id,'reserveMicroUsd',charge,'reservationId',p_request_id);
 END $function$

$definition$;
 EXECUTE $definition$
CREATE OR REPLACE FUNCTION public.settle_public_ai_call(p_request_id text, p_context_id text, p_policy_id text, p_receipt jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE r public_ai_budget.reservation%ROWTYPE; prior public_ai_budget.provider_usage_receipt%ROWTYPE;
 k text; input_count bigint; output_count bigint; charge bigint; group_name text; digest text;
 expected_keys text[]:=ARRAY['cached_tokens','cache_write_tokens','input_text_tokens','input_tokens','model','output_text_tokens','output_tokens','provider_request_id','reasoning_tokens','response_id','service_tier','status','total_tokens','version'];
BEGIN
 IF p_request_id IS NULL OR p_context_id IS NULL OR p_policy_id IS NULL OR p_receipt IS NULL
 OR jsonb_typeof(p_receipt)<>'object' OR octet_length(p_receipt::text)>4096
 OR (SELECT array_agg(key ORDER BY key) FROM jsonb_object_keys(p_receipt) key) IS DISTINCT FROM (SELECT array_agg(x ORDER BY x) FROM unnest(expected_keys) x)
 THEN RAISE EXCEPTION 'Invalid receipt schema'; END IF;
 FOREACH k IN ARRAY ARRAY['version','input_tokens','output_tokens','total_tokens','cached_tokens','cache_write_tokens','reasoning_tokens','input_text_tokens','output_text_tokens'] LOOP
  IF jsonb_typeof(p_receipt->k)<>'number' OR (p_receipt->>k)!~'^[0-9]{1,7}$' THEN RAISE EXCEPTION 'Invalid receipt count'; END IF;
 END LOOP;
 FOREACH k IN ARRAY ARRAY['response_id','model','service_tier','status'] LOOP
  IF jsonb_typeof(p_receipt->k)<>'string' THEN RAISE EXCEPTION 'Invalid receipt metadata'; END IF;
 END LOOP;
 IF p_receipt->>'version'<>'1' OR p_receipt->>'status'<>'completed' OR p_receipt->>'service_tier'<>'default'
 OR (p_receipt->>'response_id')!~'^resp_[A-Za-z0-9_-]{1,120}$'
 OR NOT (p_receipt->'provider_request_id'='null'::jsonb OR (jsonb_typeof(p_receipt->'provider_request_id')='string' AND (p_receipt->>'provider_request_id')~'^req_[A-Za-z0-9_-]{1,120}$'))
 THEN RAISE EXCEPTION 'Unsupported receipt metadata'; END IF;
 input_count:=(p_receipt->>'input_tokens')::bigint; output_count:=(p_receipt->>'output_tokens')::bigint;
 IF input_count<1 OR input_count>1050000 OR output_count>5000
 OR (p_receipt->>'total_tokens')::bigint<>input_count+output_count
 OR (p_receipt->>'input_text_tokens')::bigint<>input_count OR (p_receipt->>'output_text_tokens')::bigint<>output_count
 OR (p_receipt->>'cached_tokens')::bigint>input_count OR (p_receipt->>'reasoning_tokens')::bigint>output_count
 OR (p_receipt->>'cache_write_tokens')::bigint<>0 THEN RAISE EXCEPTION 'Unsupported receipt usage'; END IF;
 -- Same lock as admission/operator settlement. Never lower original gross reservation history.
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND cap_micro_usd=20000000 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Budget unavailable'; END IF;
 SELECT * INTO r FROM public_ai_budget.reservation WHERE request_id=p_request_id;
 IF NOT FOUND OR r.context_id IS DISTINCT FROM p_context_id OR r.policy_id IS DISTINCT FROM p_policy_id THEN RAISE EXCEPTION 'Reservation mismatch'; END IF;
 SELECT * INTO prior FROM public_ai_budget.provider_usage_receipt WHERE request_id=p_request_id;
 IF FOUND THEN
  IF prior.receipt=p_receipt THEN RETURN jsonb_build_object('settled',true,'replayed',true,'charged_micro_usd',prior.charged_micro_usd); END IF;
  RAISE EXCEPTION 'Receipt replay conflict';
 END IF;
 -- Only fresh returns qualify; historic uncertain holds require separate operator evidence.
 IF r.created_at<clock_timestamp()-interval '10 minutes' OR r.created_at>clock_timestamp()
 OR r.created_at<'2026-10-21T00:00:00Z'::timestamptz OR r.created_at>='2026-10-22T22:51:00Z'::timestamptz
 THEN RAISE EXCEPTION 'Receipt policy window unavailable'; END IF;
 IF p_policy_id='planner-sol-20261020-v1' AND p_receipt->>'model'='gpt-6.1-sol' AND r.reserved_micro_usd=4800000 THEN
  charge:=ceil((input_count::numeric*4+output_count::numeric*15)*1.1)::bigint;
 ELSIF p_policy_id='planner-sol-4k-20261022-v1' AND p_receipt->>'model'='gpt-6.1-sol' AND r.reserved_micro_usd=4686000 AND output_count<=4000 THEN
  charge:=ceil((input_count::numeric*4+output_count::numeric*15)*1.1)::bigint;
 ELSIF p_policy_id='planner-luna-20261020-v1' AND p_receipt->>'model'='gpt-5.6-luna' AND r.reserved_micro_usd=500000 THEN
  charge:=ceil((input_count::numeric*4+output_count::numeric*18)*0.11)::bigint;
 ELSE RAISE EXCEPTION 'Receipt price policy mismatch'; END IF;
 IF charge>r.reserved_micro_usd THEN RAISE EXCEPTION 'Receipt overrun retains hold'; END IF;
 group_name:='call-'||p_request_id;
 digest:=encode(sha256(convert_to(jsonb_build_object('request',p_request_id,'context',p_context_id,'policy',p_policy_id,'receipt',p_receipt)::text,'UTF8')),'hex');
 PERFORM public_ai_budget.append_settlement_group(group_name,digest,jsonb_build_object('kind','server-usage-v1','receipt',p_receipt),ARRAY[p_request_id],charge);
 INSERT INTO public_ai_budget.provider_usage_receipt(request_id,response_id,receipt,charged_micro_usd,group_id)
 VALUES(p_request_id,p_receipt->>'response_id',p_receipt,charge,group_name);
 -- Drain only these integrity triggers while still inside the privileged scope.
 -- At outer commit the caller intentionally cannot read settlement membership.
 SET CONSTRAINTS public_ai_budget.group_members_complete,public_ai_budget.member_group_complete IMMEDIATE;
 SET CONSTRAINTS public_ai_budget.group_members_complete,public_ai_budget.member_group_complete DEFERRED;
 RETURN jsonb_build_object('settled',true,'replayed',false,'charged_micro_usd',charge);
END $function$

$definition$;
 SELECT jsonb_agg(to_jsonb(p)-'prosrc' ORDER BY p.proname) INTO after_meta FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('reserve_public_ai','settle_public_ai_call');
 IF after_meta IS DISTINCT FROM before_meta THEN RAISE EXCEPTION 'Function permissions or metadata changed'; END IF;
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public_ai_budget' AND c.relkind='r' LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text, %L ORDER BY to_jsonb(r)::text), %L)) FROM public_ai_budget.%I r','','',t.relname) INTO h;
  after_rows:=after_rows||jsonb_build_object(t.relname,h);
 END LOOP;
 IF after_rows IS DISTINCT FROM before_rows THEN RAISE EXCEPTION 'Accounting rows changed'; END IF;
END $bounded$;

COMMIT;
