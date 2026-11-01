-- LOCAL REVIEW DRAFT. NO PRODUCTION EXECUTION BY AUTHOR.
-- Pricing validity only. No cap/credential/permission/accounting mutation or automatic renewal.
BEGIN;
SET LOCAL statement_timeout='15s'; SET LOCAL lock_timeout='2s';
LOCK TABLE public_ai_budget.rollout IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public_ai_budget.pricing_verification,public_ai_budget.approved_pricing_terms,public_ai_budget.reservation_pricing,public_ai_budget.reservation,public_ai_budget.settlement_group,public_ai_budget.settlement_member,public_ai_budget.settlement_debit,public_ai_budget.provider_usage_receipt,public_ai_budget.pricing_renewal_credential IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE nonexpiring_rows_before(table_name text PRIMARY KEY,digest text) ON COMMIT DROP;
DO $snapshot$ DECLARE t record; h text; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public_ai_budget' AND c.relkind='r' LOOP
 EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text, %L ORDER BY to_jsonb(r)::text),%L)) FROM public_ai_budget.%I r','','',t.relname) INTO h;
 INSERT INTO nonexpiring_rows_before VALUES(t.relname,h);
 END LOOP;
END $snapshot$;
CREATE TEMP TABLE nonexpiring_acl_before ON COMMIT DROP AS SELECT oid,proowner,proacl,proconfig,prosecdef FROM pg_proc WHERE oid IN ('public.get_public_ai_pricing()'::regprocedure,'public.renew_public_ai_pricing(text,text,text,timestamptz,jsonb)'::regprocedure,'public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure);
CREATE TEMP TABLE nonexpiring_tables_before ON COMMIT DROP AS SELECT oid,relowner,relacl,relrowsecurity FROM pg_class WHERE relnamespace='public_ai_budget'::regnamespace AND relkind='r';
DO $guard$ BEGIN
 IF current_user<>'postgres' OR (SELECT count(*) FROM public_ai_budget.rollout)<>1 OR NOT EXISTS(SELECT 1 FROM public_ai_budget.rollout WHERE cap_micro_usd=100000000 AND policy_id='planner-20261020-multiprice-v1' AND per_call_micro_usd=4800000)
 OR EXISTS(SELECT 1 FROM nonexpiring_acl_before WHERE proowner<>'postgres'::regrole OR NOT prosecdef OR proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'] OR proacl IS DISTINCT FROM ARRAY['postgres=X/postgres','service_role=X/postgres']::aclitem[])
 OR md5(pg_get_functiondef('public.get_public_ai_pricing()'::regprocedure))<>'d336d8fbf2f45bb1421f440639e16ef3'
 OR md5(pg_get_functiondef('public.renew_public_ai_pricing(text,text,text,timestamptz,jsonb)'::regprocedure))<>'287d968af02aedd05da89565c690306d'
 OR md5(pg_get_functiondef('public.reserve_public_ai(text,text,text,bigint)'::regprocedure))<>'e1ebf204a16cb615d739ffe3eac270fe'
 OR md5(pg_get_functiondef('public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure))<>'f0be2fbdebafcaa02ed65058f65db436'
 OR NOT EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public_ai_budget.pricing_verification'::regclass AND attname='valid_until' AND attnotnull)
 OR (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public_ai_budget.pricing_verification'::regclass AND conname='pricing_verification_check') IS DISTINCT FROM 'CHECK (((valid_until >= observed_at) AND (valid_until <= (observed_at + ''24:00:00''::interval))))'
 OR (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public_ai_budget.rollout'::regclass AND conname='rollout_check') IS DISTINCT FROM 'CHECK (((NOT enabled) OR ((policy_id IS NOT NULL) AND (per_call_micro_usd IS NOT NULL) AND (pricing_valid_until IS NOT NULL))))'
 THEN RAISE EXCEPTION 'Non-expiring pricing baseline mismatch'; END IF;
END $guard$;
ALTER TABLE public_ai_budget.pricing_verification ALTER COLUMN valid_until DROP NOT NULL;
ALTER TABLE public_ai_budget.pricing_verification DROP CONSTRAINT pricing_verification_check;
ALTER TABLE public_ai_budget.pricing_verification ADD CONSTRAINT pricing_verification_check CHECK(valid_until IS NULL OR (valid_until>=observed_at AND valid_until<=observed_at+interval '24 hours'));
ALTER TABLE public_ai_budget.rollout DROP CONSTRAINT rollout_check;
ALTER TABLE public_ai_budget.rollout ADD CONSTRAINT rollout_check CHECK(NOT enabled OR (policy_id IS NOT NULL AND per_call_micro_usd IS NOT NULL));
CREATE OR REPLACE FUNCTION public.get_public_ai_pricing()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE v public_ai_budget.pricing_verification%ROWTYPE;t public_ai_budget.approved_pricing_terms%ROWTYPE; active boolean;
BEGIN

 SELECT * INTO v FROM public_ai_budget.pricing_verification ORDER BY sequence DESC LIMIT 1;
 SELECT * INTO t FROM public_ai_budget.approved_pricing_terms WHERE digest=v.terms_digest;
 SELECT enabled INTO active FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1';
 RETURN jsonb_build_object('version',v.event_id,'termsDigest',t.digest,'verificationDigest',t.terms->>'verificationDigest','verifiedAt',v.observed_at,'validUntil',v.valid_until,'terms',t.terms,'status',CASE WHEN active AND v.event_id IS NOT NULL AND v.matches IS TRUE AND t.digest IS NOT NULL AND v.observed_at<=clock_timestamp() AND (v.valid_until IS NULL OR v.valid_until>clock_timestamp()+interval '30 seconds') AND EXISTS(SELECT 1 FROM public_ai_budget.rollout b WHERE b.id='public-9037-ai-initial-v1' AND b.pricing_valid_until IS NOT DISTINCT FROM v.valid_until) THEN 'current' ELSE 'unavailable' END);
END $function$
;
CREATE OR REPLACE FUNCTION public.renew_public_ai_pricing(p_token text, p_event_id text, p_verification_digest text, p_observed_at timestamp with time zone, p_sources jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE prior public_ai_budget.pricing_verification%ROWTYPE; expiry timestamptz; latest timestamptz; expected_digest text; source_hashes jsonb;
BEGIN
 IF p_token IS NULL OR octet_length(p_token)<32 OR octet_length(p_token)>256 OR NOT EXISTS(SELECT 1 FROM public_ai_budget.pricing_renewal_credential WHERE id='scheduled-verifier' AND enabled AND token_sha256=encode(sha256(convert_to(p_token,'UTF8')),'hex')) THEN RAISE EXCEPTION 'Renewal authentication failed'; END IF;
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Budget unavailable'; END IF;
 SELECT digest INTO STRICT expected_digest FROM public_ai_budget.approved_pricing_terms WHERE terms->>'verificationDigest'=p_verification_digest;
 IF p_event_id IS NULL OR p_event_id!~'^[a-zA-Z0-9_-]{12,80}$' OR p_verification_digest IS DISTINCT FROM 'ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3' OR p_observed_at IS NULL OR p_sources IS NULL OR jsonb_typeof(p_sources)<>'array' OR jsonb_array_length(p_sources)<>4 OR octet_length(p_sources::text)>8192 THEN RAISE EXCEPTION 'Invalid pricing attestation'; END IF;
 SELECT jsonb_agg(x ORDER BY x->>'url') INTO source_hashes FROM jsonb_array_elements(p_sources) x;
 IF source_hashes IS DISTINCT FROM '[{"url":"https://developers.openai.com/api/docs/guides/prompt-caching.md","sha256":"8c672dafd6a332d4b9ad7464aefa3ca4f6b0fffa8bf66bb5ee087e1b39152711"},{"url":"https://developers.openai.com/api/docs/models/gpt-5.6-luna.md","sha256":"bf9fdb1c3b6466c37fb856e5f8e5973ff088164b6c7792d3fb15e0d9927bd781"},{"url":"https://developers.openai.com/api/docs/models/gpt-6.1-sol.md","sha256":"ebcc1b0ae6c729a64411dacf303c0ae8b91b11a9be176dc8997b2652bec4b9b0"},{"url":"https://developers.openai.com/api/docs/pricing.md","sha256":"56e3da9bb29246cad60003e01f3fdc6b536149a09f5effe5e79af020a4922cfc"}]'::jsonb THEN RAISE EXCEPTION 'Official source fingerprints changed or incomplete'; END IF;
 SELECT * INTO prior FROM public_ai_budget.pricing_verification WHERE event_id=p_event_id;
 IF FOUND THEN IF prior.terms_digest=expected_digest AND prior.observed_at=p_observed_at AND prior.sources=source_hashes AND prior.matches THEN RETURN jsonb_build_object('recorded',true,'replayed',true,'version',prior.event_id,'verifiedAt',prior.observed_at,'validUntil',prior.valid_until); END IF; RAISE EXCEPTION 'Attestation replay conflict'; END IF;
 IF p_observed_at>clock_timestamp() OR p_observed_at<clock_timestamp()-interval '5 minutes' THEN RAISE EXCEPTION 'Stale/future attestation'; END IF;
 SELECT max(observed_at) INTO latest FROM public_ai_budget.pricing_verification;
 IF latest IS NOT NULL AND p_observed_at<=latest THEN RAISE EXCEPTION 'Out-of-order attestation'; END IF;
 IF EXISTS(SELECT 1 FROM (SELECT matches FROM public_ai_budget.pricing_verification ORDER BY sequence DESC LIMIT 1) current_event WHERE matches IS NOT TRUE) THEN RAISE EXCEPTION 'Pricing explicitly revoked; operator review required'; END IF;
 expiry:=NULL; -- Explicit non-expiring verified pricing; never changes spending authorization.
 INSERT INTO public_ai_budget.pricing_verification(event_id,terms_digest,observed_at,valid_until,matches,sources) VALUES(p_event_id,expected_digest,p_observed_at,expiry,true,source_hashes);
 UPDATE public_ai_budget.rollout SET pricing_valid_until=expiry WHERE id='public-9037-ai-initial-v1';
 RETURN jsonb_build_object('recorded',true,'replayed',false,'version',p_event_id,'verifiedAt',p_observed_at,'validUntil',expiry);
END $function$
;
CREATE OR REPLACE FUNCTION public.reserve_public_ai(p_request_id text, p_context_id text, p_policy_id text, p_reserve_micro_usd bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
 DECLARE b public_ai_budget.rollout%ROWTYPE; charge bigint; used numeric; v public_ai_budget.pricing_verification%ROWTYPE; t public_ai_budget.approved_pricing_terms%ROWTYPE; spec jsonb;
 BEGIN
  IF p_request_id IS NULL OR p_request_id !~ '^[a-zA-Z0-9_-]{12,80}$'
  OR p_context_id IS NULL OR p_context_id !~ '^[a-f0-9]{64}$'
  OR p_policy_id IS NULL OR p_policy_id !~ '^[a-zA-Z0-9_-]{1,80}$'
  OR p_reserve_micro_usd IS NULL THEN
   RETURN jsonb_build_object('granted',false);
  END IF;
  SELECT * INTO b FROM public_ai_budget.rollout
  WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('granted',false); END IF;
  SELECT * INTO v FROM public_ai_budget.pricing_verification ORDER BY sequence DESC LIMIT 1;
  IF NOT FOUND OR v.matches IS NOT TRUE OR v.observed_at>clock_timestamp() OR (v.valid_until IS NOT NULL AND v.valid_until<=clock_timestamp()+interval '30 seconds') THEN RETURN jsonb_build_object('granted',false); END IF;
  SELECT * INTO t FROM public_ai_budget.approved_pricing_terms WHERE digest=v.terms_digest;
  SELECT x INTO spec FROM jsonb_array_elements(t.terms->'policies') x WHERE x->>'id'=p_policy_id;
  IF spec IS NULL OR (spec->>'reserveMicroUsd')::bigint IS DISTINCT FROM p_reserve_micro_usd THEN RETURN jsonb_build_object('granted',false); END IF;
  IF NOT b.enabled OR b.pricing_valid_until IS DISTINCT FROM v.valid_until
  OR (b.pricing_valid_until IS NOT NULL AND b.pricing_valid_until <= clock_timestamp()+interval '30 seconds') THEN
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
   OR b.pricing_valid_until IS DISTINCT FROM v.valid_until
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
  INSERT INTO public_ai_budget.reservation_pricing(request_id,verification_id,terms_digest) VALUES(p_request_id,v.event_id,v.terms_digest);
  UPDATE public_ai_budget.rollout SET reserved_micro_usd=reserved_micro_usd+charge
  WHERE id=b.id;
  RETURN jsonb_build_object('granted',true,'requestId',p_request_id,'contextId',p_context_id,
   'policyId',p_policy_id,'reserveMicroUsd',charge,'reservationId',p_request_id);
 END $function$
;
CREATE OR REPLACE FUNCTION public.settle_public_ai_call(p_request_id text, p_context_id text, p_policy_id text, p_receipt jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE r public_ai_budget.reservation%ROWTYPE; prior public_ai_budget.provider_usage_receipt%ROWTYPE;
 binding public_ai_budget.reservation_pricing%ROWTYPE; v public_ai_budget.pricing_verification%ROWTYPE; spec jsonb;
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
 IF input_count<1 OR input_count>1050000 OR output_count>10000
 OR (p_receipt->>'total_tokens')::bigint<>input_count+output_count
 OR (p_receipt->>'input_text_tokens')::bigint<>input_count OR (p_receipt->>'output_text_tokens')::bigint<>output_count
 OR (p_receipt->>'cached_tokens')::bigint>input_count OR (p_receipt->>'reasoning_tokens')::bigint>output_count
 OR (p_receipt->>'cache_write_tokens')::bigint<>0 THEN RAISE EXCEPTION 'Unsupported receipt usage'; END IF;
 -- Same lock as admission/operator settlement. Never lower original gross reservation history.
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND cap_micro_usd=100000000 FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Budget unavailable'; END IF;
 SELECT * INTO r FROM public_ai_budget.reservation WHERE request_id=p_request_id;
 IF NOT FOUND OR r.context_id IS DISTINCT FROM p_context_id OR r.policy_id IS DISTINCT FROM p_policy_id THEN RAISE EXCEPTION 'Reservation mismatch'; END IF;
 SELECT * INTO prior FROM public_ai_budget.provider_usage_receipt WHERE request_id=p_request_id;
 IF FOUND THEN
  IF prior.receipt=p_receipt THEN RETURN jsonb_build_object('settled',true,'replayed',true,'charged_micro_usd',prior.charged_micro_usd); END IF;
  RAISE EXCEPTION 'Receipt replay conflict';
 END IF;
 SELECT * INTO binding FROM public_ai_budget.reservation_pricing WHERE request_id=p_request_id;
 IF NOT FOUND THEN
  IF output_count>5000 THEN RAISE EXCEPTION 'Legacy receipt output limit'; END IF;
 -- Only fresh returns qualify; historic uncertain holds require separate operator evidence.
 IF r.created_at<clock_timestamp()-interval '10 minutes' OR r.created_at>clock_timestamp()
 OR r.created_at<'2026-10-21T00:00:00Z'::timestamptz OR r.created_at>='2026-10-26T15:05:00Z'::timestamptz
 THEN RAISE EXCEPTION 'Receipt policy window unavailable'; END IF;
 IF p_policy_id='planner-sol-20261020-v1' AND p_receipt->>'model'='gpt-6.1-sol' AND r.reserved_micro_usd=4800000 THEN
  charge:=ceil((input_count::numeric*4+output_count::numeric*15)*1.1)::bigint;
 ELSIF p_policy_id='planner-sol-4k-20261022-v1' AND p_receipt->>'model'='gpt-6.1-sol' AND r.reserved_micro_usd=4686000 AND output_count<=4000 THEN
  charge:=ceil((input_count::numeric*4+output_count::numeric*15)*1.1)::bigint;
 ELSIF p_policy_id='planner-luna-20261020-v1' AND p_receipt->>'model'='gpt-5.6-luna' AND r.reserved_micro_usd=500000 THEN
  charge:=ceil((input_count::numeric*4+output_count::numeric*18)*0.11)::bigint;
 ELSE RAISE EXCEPTION 'Receipt price policy mismatch'; END IF;

 ELSE
  SELECT * INTO v FROM public_ai_budget.pricing_verification WHERE event_id=binding.verification_id AND terms_digest=binding.terms_digest;
  SELECT x INTO spec FROM public_ai_budget.approved_pricing_terms t,jsonb_array_elements(t.terms->'policies') x WHERE t.digest=binding.terms_digest AND x->>'id'=p_policy_id;
  IF v.event_id IS NULL OR NOT v.matches OR spec IS NULL OR r.created_at<v.observed_at OR (v.valid_until IS NOT NULL AND r.created_at>=v.valid_until) OR r.created_at>clock_timestamp() OR r.created_at<clock_timestamp()-interval '10 minutes'
  OR p_receipt->>'model' IS DISTINCT FROM spec->>'model' OR output_count>(spec->>'maxOutputTokens')::bigint OR r.reserved_micro_usd IS DISTINCT FROM (spec->>'reserveMicroUsd')::bigint THEN RAISE EXCEPTION 'Admitted policy binding unavailable'; END IF;
  charge:=ceil((input_count::numeric*(spec->>'inputMicroPerMillion')::numeric+output_count::numeric*(spec->>'outputMicroPerMillion')::numeric)/1000000*1.1)::bigint;
 END IF;
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
;
DO $post$ DECLARE t record; h text; BEGIN
 FOR t IN SELECT * FROM nonexpiring_rows_before LOOP
 EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text, %L ORDER BY to_jsonb(r)::text),%L)) FROM public_ai_budget.%I r','','',t.table_name) INTO h;
 IF h IS DISTINCT FROM t.digest THEN RAISE EXCEPTION 'Accounting/history rows changed: %',t.table_name; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM nonexpiring_acl_before b JOIN pg_proc p USING(oid) WHERE ROW(b.proowner,b.proacl,b.proconfig,b.prosecdef) IS DISTINCT FROM ROW(p.proowner,p.proacl,p.proconfig,p.prosecdef))
 OR EXISTS(SELECT 1 FROM nonexpiring_tables_before b JOIN pg_class p USING(oid) WHERE ROW(b.relowner,b.relacl,b.relrowsecurity) IS DISTINCT FROM ROW(p.relowner,p.relacl,p.relrowsecurity)) THEN RAISE EXCEPTION 'Security invariant changed'; END IF;
END $post$;
COMMIT;
