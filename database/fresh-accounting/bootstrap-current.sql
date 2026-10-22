-- Fresh empty accounting schema only; never apply to an existing deployment.
-- No company data, historical settlements, rollout row or enabled allowance is seeded.
BEGIN;
DO $guard$ BEGIN
 IF current_user <> 'postgres' OR to_regnamespace('public_ai_budget') IS NOT NULL
 OR to_regprocedure('public.reserve_public_ai(text,text,text,bigint)') IS NOT NULL
 OR to_regprocedure('public.settle_public_ai_call(text,text,text,jsonb)') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls AND NOT rolsuper)
 OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') AND (rolsuper OR rolcreaterole))
 OR pg_has_role('service_role','postgres','MEMBER')
 THEN RAISE EXCEPTION 'Requires empty schema and reviewed existing roles'; END IF;
END $guard$;
CREATE SCHEMA public_ai_budget;
REVOKE ALL ON SCHEMA public_ai_budget FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE public_ai_budget.rollout (
 id text PRIMARY KEY CHECK (id = 'public-9037-ai-initial-v1'),
 cap_micro_usd bigint NOT NULL CHECK (cap_micro_usd = 50000000),
 reserved_micro_usd bigint NOT NULL DEFAULT 0 CHECK (reserved_micro_usd >= 0),
 enabled boolean NOT NULL DEFAULT false,
 policy_id text,
 per_call_micro_usd bigint CHECK (per_call_micro_usd > 0 AND per_call_micro_usd <= 5000000),
 pricing_valid_until timestamptz,
 CHECK (NOT enabled OR (policy_id IS NOT NULL AND per_call_micro_usd IS NOT NULL AND pricing_valid_until IS NOT NULL))
);
-- SECURITY INVOKER reservation needs UPDATE, so protect the invariant even if
-- service_role directly updates the counter outside the RPC. An increase only
-- consumes budget; a decrease would replenish it and must be impossible.
CREATE FUNCTION public_ai_budget.enforce_monotonic_reservation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $$
BEGIN
 IF NEW.reserved_micro_usd < OLD.reserved_micro_usd THEN
  RAISE EXCEPTION 'AI budget reservations cannot decrease' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public_ai_budget.enforce_monotonic_reservation() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER public_ai_reservation_monotonic
BEFORE UPDATE ON public_ai_budget.rollout
FOR EACH ROW EXECUTE FUNCTION public_ai_budget.enforce_monotonic_reservation();
-- Migration owner must NOT be service_role or a role it can assume.
-- No ownership/ALTER/TRIGGER/TRUNCATE/DELETE rights are granted to service_role.
CREATE TABLE public_ai_budget.reservation (
 request_id text PRIMARY KEY,
 context_id text NOT NULL,
 policy_id text NOT NULL,
 reserved_micro_usd bigint NOT NULL CHECK (reserved_micro_usd > 0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON ALL TABLES IN SCHEMA public_ai_budget FROM PUBLIC, anon, authenticated, service_role;
ALTER TABLE public_ai_budget.rollout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_budget.reservation ENABLE ROW LEVEL SECURITY;
-- service_role's existing BYPASSRLS is required; no new role attribute is granted.
-- Inspect effective privileges/role inheritance before activation, not just ACLs.
-- SECURITY INVOKER: narrowly scoped existing service role privileges are needed.
GRANT USAGE ON SCHEMA public_ai_budget TO service_role;
GRANT SELECT, UPDATE (reserved_micro_usd) ON public_ai_budget.rollout TO service_role;
GRANT SELECT, INSERT ON public_ai_budget.reservation TO service_role;
CREATE TABLE public_ai_budget.settlement_group(
 group_id text PRIMARY KEY, evidence_digest text NOT NULL UNIQUE CHECK(evidence_digest ~ '^[a-f0-9]{64}$'),
 evidence jsonb NOT NULL, member_count integer NOT NULL CHECK(member_count>0),
 reserved_micro_usd bigint NOT NULL CHECK(reserved_micro_usd>0), charged_micro_usd bigint NOT NULL CHECK(charged_micro_usd>=0 AND charged_micro_usd<=reserved_micro_usd), created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE public_ai_budget.settlement_member(
 request_id text PRIMARY KEY REFERENCES public_ai_budget.reservation(request_id),
 group_id text NOT NULL REFERENCES public_ai_budget.settlement_group(group_id));
CREATE TABLE public_ai_budget.settlement_debit(
 event_id text PRIMARY KEY, group_id text NOT NULL REFERENCES public_ai_budget.settlement_group(group_id),
 evidence_digest text NOT NULL CHECK(evidence_digest ~ '^[a-f0-9]{64}$'), evidence jsonb NOT NULL,
 amount_micro_usd bigint NOT NULL CHECK(amount_micro_usd>0), halt_admission boolean NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), UNIQUE(group_id,evidence_digest));
REVOKE ALL ON public_ai_budget.settlement_group,public_ai_budget.settlement_member,public_ai_budget.settlement_debit FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE public_ai_budget.settlement_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_budget.settlement_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_budget.settlement_debit ENABLE ROW LEVEL SECURITY;
-- EXPLICIT NEW READ PRIVILEGE: only accounting inputs used by existing SECURITY INVOKER RPC.
GRANT SELECT (reserved_micro_usd,charged_micro_usd) ON public_ai_budget.settlement_group TO service_role;
GRANT SELECT (amount_micro_usd,halt_admission) ON public_ai_budget.settlement_debit TO service_role;
CREATE FUNCTION public_ai_budget.reject_settlement_mutation() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
BEGIN RAISE EXCEPTION 'Settlement history is append-only'; END $f$;
CREATE TRIGGER settlement_group_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.settlement_group FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
CREATE TRIGGER settlement_member_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.settlement_member FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
CREATE TRIGGER settlement_debit_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.settlement_debit FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
CREATE FUNCTION public_ai_budget.verify_settlement_members() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
BEGIN
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public_ai_budget.settlement_group g WHERE g.member_count<>(SELECT count(*) FROM public_ai_budget.settlement_member m WHERE m.group_id=g.group_id) OR g.reserved_micro_usd IS DISTINCT FROM (SELECT sum(r.reserved_micro_usd) FROM public_ai_budget.settlement_member m JOIN public_ai_budget.reservation r USING(request_id) WHERE m.group_id=g.group_id)) THEN RAISE EXCEPTION 'Settlement member mismatch'; END IF;
 RETURN NULL;
END $f$;
CREATE CONSTRAINT TRIGGER group_members_complete AFTER INSERT ON public_ai_budget.settlement_group DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public_ai_budget.verify_settlement_members();
CREATE CONSTRAINT TRIGGER member_group_complete AFTER INSERT ON public_ai_budget.settlement_member DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public_ai_budget.verify_settlement_members();
CREATE FUNCTION public_ai_budget.append_settlement_group(p_id text,p_digest text,p_evidence jsonb,p_members text[],p_charge bigint) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE old public_ai_budget.settlement_group%ROWTYPE; ids text[]; total bigint;
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Operator only'; END IF;
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 IF NOT FOUND OR p_id IS NULL OR p_digest IS NULL OR p_evidence IS NULL OR p_members IS NULL OR p_charge IS NULL OR p_charge<0 THEN RAISE EXCEPTION 'Invalid group'; END IF;
 SELECT array_agg(x ORDER BY x) INTO ids FROM unnest(p_members) x;
 IF cardinality(ids)=0 OR cardinality(ids)<>(SELECT count(DISTINCT x) FROM unnest(ids) x) THEN RAISE EXCEPTION 'Invalid members'; END IF;
 IF (SELECT count(*) FROM public_ai_budget.settlement_group WHERE group_id=p_id OR evidence_digest=p_digest)>1 THEN RAISE EXCEPTION 'Conflicting group identities'; END IF;
 SELECT * INTO old FROM public_ai_budget.settlement_group WHERE group_id=p_id OR evidence_digest=p_digest;
 IF FOUND THEN
  IF old.evidence_digest=p_digest AND old.evidence=p_evidence AND old.charged_micro_usd=p_charge AND ids=(SELECT array_agg(request_id ORDER BY request_id) FROM public_ai_budget.settlement_member WHERE group_id=old.group_id) THEN RETURN false; END IF;
  RAISE EXCEPTION 'Conflicting group';
 END IF;
 IF (SELECT count(*) FROM public_ai_budget.reservation WHERE request_id=ANY(ids))<>cardinality(ids) THEN RAISE EXCEPTION 'Unknown member'; END IF;
 SELECT sum(reserved_micro_usd) INTO total FROM public_ai_budget.reservation WHERE request_id=ANY(ids);
 IF p_charge>total THEN RAISE EXCEPTION 'Group overrun requires retained holds and separate debit review'; END IF;
 INSERT INTO public_ai_budget.settlement_group(group_id,evidence_digest,evidence,member_count,reserved_micro_usd,charged_micro_usd) VALUES(p_id,p_digest,p_evidence,cardinality(ids),total,p_charge);
 INSERT INTO public_ai_budget.settlement_member SELECT x,p_id FROM unnest(ids) x;
 RETURN true;
END $f$;
CREATE FUNCTION public_ai_budget.append_settlement_debit(p_id text,p_group text,p_digest text,p_evidence jsonb,p_amount bigint) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $f$
DECLARE old public_ai_budget.settlement_debit%ROWTYPE; used numeric; cap bigint;
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Operator only'; END IF;
 SELECT cap_micro_usd INTO cap FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 IF NOT FOUND OR p_amount IS NULL OR p_amount<=0 OR p_id IS NULL OR p_digest IS NULL OR p_evidence IS NULL THEN RAISE EXCEPTION 'Invalid debit'; END IF;
 IF (SELECT count(*) FROM public_ai_budget.settlement_debit WHERE event_id=p_id OR (group_id=p_group AND evidence_digest=p_digest))>1 THEN RAISE EXCEPTION 'Conflicting debit identities'; END IF;
 SELECT * INTO old FROM public_ai_budget.settlement_debit WHERE event_id=p_id OR (group_id=p_group AND evidence_digest=p_digest);
 IF FOUND THEN IF old.group_id=p_group AND old.evidence_digest=p_digest AND old.evidence=p_evidence AND old.amount_micro_usd=p_amount THEN RETURN false; END IF; RAISE EXCEPTION 'Conflicting debit'; END IF;
 SELECT reserved_micro_usd-coalesce((SELECT sum(reserved_micro_usd-charged_micro_usd) FROM public_ai_budget.settlement_group),0)+coalesce((SELECT sum(amount_micro_usd) FROM public_ai_budget.settlement_debit),0) INTO used FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1';
 INSERT INTO public_ai_budget.settlement_debit(event_id,group_id,evidence_digest,evidence,amount_micro_usd,halt_admission) VALUES(p_id,p_group,p_digest,p_evidence,p_amount,used+p_amount>cap);
 RETURN true;
END $f$;
REVOKE ALL ON FUNCTION public_ai_budget.reject_settlement_mutation(), public_ai_budget.verify_settlement_members(),public_ai_budget.append_settlement_group(text,text,jsonb,text[],bigint),public_ai_budget.append_settlement_debit(text,text,text,jsonb,bigint) FROM PUBLIC,anon,authenticated,service_role;
CREATE TABLE public_ai_budget.provider_usage_receipt(
 request_id text PRIMARY KEY REFERENCES public_ai_budget.reservation(request_id),
 response_id text NOT NULL UNIQUE,
 receipt jsonb NOT NULL,
 charged_micro_usd bigint NOT NULL CHECK(charged_micro_usd>=0),
 group_id text NOT NULL UNIQUE REFERENCES public_ai_budget.settlement_group(group_id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp());
ALTER TABLE public_ai_budget.provider_usage_receipt ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public_ai_budget.provider_usage_receipt FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER provider_receipt_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.provider_usage_receipt
 FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
CREATE FUNCTION public.reserve_public_ai(p_request_id text, p_context_id text, p_policy_id text, p_reserve_micro_usd bigint)
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
   OR b.pricing_valid_until>'2026-10-23T15:00:00Z'::timestamptz
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
  IF b.reserved_micro_usd IS DISTINCT FROM (SELECT coalesce(sum(reserved_micro_usd),0) FROM public_ai_budget.reservation)
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
 END $function$;
CREATE FUNCTION public.settle_public_ai_call(p_request_id text, p_context_id text, p_policy_id text, p_receipt jsonb)
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
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND cap_micro_usd=50000000 FOR UPDATE;
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
 OR r.created_at<'2026-10-21T00:00:00Z'::timestamptz OR r.created_at>='2026-10-23T15:00:00Z'::timestamptz
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
END $function$;
ALTER FUNCTION public.settle_public_ai_call(text,text,text,jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.reserve_public_ai(text,text,text,bigint),public.settle_public_ai_call(text,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_public_ai(text,text,text,bigint),public.settle_public_ai_call(text,text,text,jsonb) TO service_role;
COMMIT;
