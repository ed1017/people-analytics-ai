-- UNAPPLIED DRAFT. No credentials provisioned; first renewal remains unavailable until separate secure provisioning.
-- Approved cumulative cap100USD includes all prior charges/holds. No paid tests or counter reset.
BEGIN;
SET LOCAL statement_timeout='10s'; SET LOCAL lock_timeout='1s';
LOCK TABLE public_ai_budget.rollout IN ACCESS EXCLUSIVE MODE;
LOCK TABLE public_ai_budget.reservation,public_ai_budget.settlement_group,public_ai_budget.settlement_member,public_ai_budget.settlement_debit,public_ai_budget.provider_usage_receipt IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE durable_before ON COMMIT DROP AS SELECT
 (SELECT to_jsonb(r)-'cap_micro_usd' FROM public_ai_budget.rollout r) rollout,
 (SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.reservation r) reservations,
 (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_group r) groups,
 (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_member r) members,
 (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_debit r) debits,
 (SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.provider_usage_receipt r) receipts;
CREATE TEMP TABLE durable_security_before ON COMMIT DROP AS SELECT
 (SELECT array_agg(oid) FROM pg_class WHERE relnamespace='public_ai_budget'::regnamespace AND relkind='r') table_ids,
 (SELECT jsonb_agg(jsonb_build_object('oid',oid,'owner',relowner,'acl',relacl,'rls',relrowsecurity) ORDER BY oid) FROM pg_class WHERE relnamespace='public_ai_budget'::regnamespace AND relkind='r') tables,
 (SELECT jsonb_agg(to_jsonb(p)-ARRAY['prosrc','prosecdef'] ORDER BY oid) FROM pg_proc p WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure)) functions;
DO $guard$ BEGIN
 IF current_user<>'postgres' OR (SELECT count(*) FROM public_ai_budget.rollout)<>1
 OR EXISTS(SELECT 1 FROM pg_proc WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure) AND (proowner<>'postgres'::regrole OR proconfig IS DISTINCT FROM ARRAY['search_path=pg_catalog'] OR proacl IS DISTINCT FROM ARRAY['postgres=X/postgres','service_role=X/postgres']::aclitem[]))
 OR NOT EXISTS(SELECT 1 FROM public_ai_budget.rollout WHERE cap_micro_usd=50000000 AND reserved_micro_usd=491032034 AND enabled AND policy_id='planner-20261020-multiprice-v1' AND pricing_valid_until='2026-10-26T15:05:00Z')
 OR (SELECT count(*) FROM public_ai_budget.reservation)<>153 OR (SELECT md5(string_agg(to_jsonb(r)::text,'' ORDER BY request_id)) FROM public_ai_budget.reservation r)<>'78f4e6b7c6a6f6dca6d285d0cdb10480'
 OR md5(pg_get_functiondef('public.reserve_public_ai(text,text,text,bigint)'::regprocedure))<>'6c7e083133b686bdd2d54b9aaaf77704'
 OR md5(pg_get_functiondef('public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure))<>'2a15f643f5fa2f0935e5377042f07e47'
 THEN RAISE EXCEPTION 'Durable pricing baseline changed; reconcile without reset'; END IF;
END $guard$;
CREATE TABLE public_ai_budget.approved_pricing_terms(digest text PRIMARY KEY CHECK(digest~'^[a-f0-9]{64}$'),terms jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(digest=encode(sha256(convert_to(terms::text,'UTF8')),'hex')));
CREATE TABLE public_ai_budget.pricing_verification(sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,event_id text PRIMARY KEY CHECK(event_id~'^[a-zA-Z0-9_-]{12,80}$'),terms_digest text NOT NULL REFERENCES public_ai_budget.approved_pricing_terms(digest),observed_at timestamptz NOT NULL,valid_until timestamptz NOT NULL,matches boolean NOT NULL,sources jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),CHECK(valid_until>=observed_at AND valid_until<=observed_at+interval '24 hours'));
CREATE TABLE public_ai_budget.reservation_pricing(request_id text PRIMARY KEY REFERENCES public_ai_budget.reservation(request_id),verification_id text NOT NULL REFERENCES public_ai_budget.pricing_verification(event_id),terms_digest text NOT NULL REFERENCES public_ai_budget.approved_pricing_terms(digest));
CREATE TABLE public_ai_budget.pricing_renewal_credential(id text PRIMARY KEY CHECK(id='scheduled-verifier'),token_sha256 text NOT NULL CHECK(token_sha256~'^[a-f0-9]{64}$'),enabled boolean NOT NULL DEFAULT false);
REVOKE ALL ON public_ai_budget.approved_pricing_terms,public_ai_budget.pricing_verification,public_ai_budget.reservation_pricing,public_ai_budget.pricing_renewal_credential FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE public_ai_budget.approved_pricing_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_budget.pricing_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_budget.reservation_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_ai_budget.pricing_renewal_credential ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER terms_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.approved_pricing_terms FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
CREATE TRIGGER verification_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.pricing_verification FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
CREATE TRIGGER reservation_pricing_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public_ai_budget.reservation_pricing FOR EACH STATEMENT EXECUTE FUNCTION public_ai_budget.reject_settlement_mutation();
INSERT INTO public_ai_budget.approved_pricing_terms(digest,terms) SELECT encode(sha256(convert_to(j::text,'UTF8')),'hex'),j FROM (SELECT $terms${"verificationDigest":"ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3","version":1,"currency":"USD","modalities":["text"],"serviceTier":"default","batch":false,"contextTokens":1050000,"longContextThreshold":272000,"longContextInputMultiplier":2,"longContextOutputMultiplier":1.5,"reasoningIncludedInOutput":true,"cache":{"mode":"explicit","breakpoints":false,"writeTokens":0,"chargeCachedAsUncached":true},"safetyBasisPoints":11000,"policies":[{"id":"planner-sol-20261020-v1","model":"gpt-6.1-sol","baseInputMicroPerMillion":2000000,"baseOutputMicroPerMillion":10000000,"inputMicroPerMillion":4000000,"outputMicroPerMillion":15000000,"maxOutputTokens":5000,"reserveMicroUsd":4800000},{"id":"planner-sol-4k-20261022-v1","model":"gpt-6.1-sol","baseInputMicroPerMillion":2000000,"baseOutputMicroPerMillion":10000000,"inputMicroPerMillion":4000000,"outputMicroPerMillion":15000000,"maxOutputTokens":4000,"reserveMicroUsd":4686000},{"id":"planner-luna-20261020-v1","model":"gpt-5.6-luna","baseInputMicroPerMillion":200000,"baseOutputMicroPerMillion":1200000,"inputMicroPerMillion":400000,"outputMicroPerMillion":1800000,"maxOutputTokens":10000,"reserveMicroUsd":500000}]}$terms$::jsonb j) s;
-- No verification is inserted: expired old policy cannot silently become fresh.
CREATE FUNCTION public.get_public_ai_pricing() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE v public_ai_budget.pricing_verification%ROWTYPE;t public_ai_budget.approved_pricing_terms%ROWTYPE; active boolean;
BEGIN
 SELECT * INTO t FROM public_ai_budget.approved_pricing_terms;
 SELECT * INTO v FROM public_ai_budget.pricing_verification WHERE matches ORDER BY sequence DESC LIMIT 1;
 SELECT enabled INTO active FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1';
 RETURN jsonb_build_object('version',v.event_id,'termsDigest',t.digest,'verificationDigest',t.terms->>'verificationDigest','verifiedAt',v.observed_at,'validUntil',v.valid_until,'terms',t.terms,'status',CASE WHEN active AND v.matches AND v.observed_at<=clock_timestamp() AND v.valid_until>clock_timestamp()+interval '30 seconds' THEN 'current' ELSE 'unavailable' END);
END $f$;
CREATE FUNCTION public.renew_public_ai_pricing(p_token text,p_event_id text,p_verification_digest text,p_observed_at timestamptz,p_sources jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $f$
DECLARE prior public_ai_budget.pricing_verification%ROWTYPE; expiry timestamptz; latest timestamptz; expected_digest text; source_hashes jsonb;
BEGIN
 IF p_token IS NULL OR octet_length(p_token)<32 OR octet_length(p_token)>256 OR NOT EXISTS(SELECT 1 FROM public_ai_budget.pricing_renewal_credential WHERE id='scheduled-verifier' AND enabled AND token_sha256=encode(sha256(convert_to(p_token,'UTF8')),'hex')) THEN RAISE EXCEPTION 'Renewal authentication failed'; END IF;
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Budget unavailable'; END IF;
 SELECT digest INTO STRICT expected_digest FROM public_ai_budget.approved_pricing_terms WHERE terms->>'verificationDigest'=p_verification_digest;
 IF p_event_id IS NULL OR p_event_id!~'^[a-zA-Z0-9_-]{12,80}$' OR p_verification_digest IS DISTINCT FROM 'ea1e9ef799beccc24cfe6b1a2e5720d1bcbef4579a16486768ea27385482a1b3' OR p_observed_at IS NULL OR p_sources IS NULL OR jsonb_typeof(p_sources)<>'array' OR jsonb_array_length(p_sources)<>4 OR octet_length(p_sources::text)>8192 THEN RAISE EXCEPTION 'Invalid pricing attestation'; END IF;
 SELECT jsonb_agg(x ORDER BY x->>'url') INTO source_hashes FROM jsonb_array_elements(p_sources) x;
 IF source_hashes IS DISTINCT FROM '[{"url":"https://developers.openai.com/api/docs/guides/prompt-caching.md","sha256":"2da1ea8a2404b306773bee6aa1027ca36c9d0bc2f8a4ea3df83166d3da9d7e6c"},{"url":"https://developers.openai.com/api/docs/models/gpt-5.6-luna.md","sha256":"bf9fdb1c3b6466c37fb856e5f8e5973ff088164b6c7792d3fb15e0d9927bd781"},{"url":"https://developers.openai.com/api/docs/models/gpt-6.1-sol.md","sha256":"374c323fe934443bd6d5f90f3e16dc4fb06552c83bde433dee60b0a84d9bd388"},{"url":"https://developers.openai.com/api/docs/pricing.md","sha256":"93d302a9b7a384877533bc3ab5bb48eebf4b56bd6add0f194095054b2a13f952"}]'::jsonb THEN RAISE EXCEPTION 'Official source fingerprints changed or incomplete'; END IF;
 SELECT * INTO prior FROM public_ai_budget.pricing_verification WHERE event_id=p_event_id;
 IF FOUND THEN IF prior.terms_digest=expected_digest AND prior.observed_at=p_observed_at AND prior.sources=source_hashes AND prior.matches THEN RETURN jsonb_build_object('recorded',true,'replayed',true,'version',prior.event_id,'verifiedAt',prior.observed_at,'validUntil',prior.valid_until); END IF; RAISE EXCEPTION 'Attestation replay conflict'; END IF;
 IF p_observed_at>clock_timestamp() OR p_observed_at<clock_timestamp()-interval '5 minutes' THEN RAISE EXCEPTION 'Stale/future attestation'; END IF;
 SELECT max(observed_at) INTO latest FROM public_ai_budget.pricing_verification;
 IF latest IS NOT NULL AND p_observed_at<=latest THEN RAISE EXCEPTION 'Out-of-order attestation'; END IF;
 expiry:=p_observed_at+interval '24 hours';
 INSERT INTO public_ai_budget.pricing_verification(event_id,terms_digest,observed_at,valid_until,matches,sources) VALUES(p_event_id,expected_digest,p_observed_at,expiry,true,source_hashes);
 UPDATE public_ai_budget.rollout SET pricing_valid_until=expiry WHERE id='public-9037-ai-initial-v1';
 RETURN jsonb_build_object('recorded',true,'replayed',false,'version',p_event_id,'verifiedAt',p_observed_at,'validUntil',expiry);
END $f$;
REVOKE ALL ON FUNCTION public.get_public_ai_pricing(),public.renew_public_ai_pricing(text,text,text,timestamptz,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.get_public_ai_pricing(),public.renew_public_ai_pricing(text,text,text,timestamptz,jsonb) TO service_role;
ALTER TABLE public_ai_budget.rollout DROP CONSTRAINT rollout_cap_micro_usd_check;
ALTER TABLE public_ai_budget.rollout ADD CONSTRAINT rollout_cap_micro_usd_check CHECK(cap_micro_usd=100000000) NOT VALID;
UPDATE public_ai_budget.rollout SET cap_micro_usd=100000000 WHERE id='public-9037-ai-initial-v1';
ALTER TABLE public_ai_budget.rollout VALIDATE CONSTRAINT rollout_cap_micro_usd_check;
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
  SELECT * INTO v FROM public_ai_budget.pricing_verification WHERE matches ORDER BY sequence DESC LIMIT 1;
  IF NOT FOUND OR NOT v.matches OR v.observed_at>clock_timestamp() OR v.valid_until<=clock_timestamp()+interval '30 seconds' THEN RETURN jsonb_build_object('granted',false); END IF;
  SELECT * INTO t FROM public_ai_budget.approved_pricing_terms WHERE digest=v.terms_digest;
  SELECT x INTO spec FROM jsonb_array_elements(t.terms->'policies') x WHERE x->>'id'=p_policy_id;
  IF spec IS NULL OR (spec->>'reserveMicroUsd')::bigint IS DISTINCT FROM p_reserve_micro_usd THEN RETURN jsonb_build_object('granted',false); END IF;
  IF NOT b.enabled OR b.pricing_valid_until IS NULL
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
  IF v.event_id IS NULL OR NOT v.matches OR spec IS NULL OR r.created_at<v.observed_at OR r.created_at>=v.valid_until OR r.created_at>clock_timestamp() OR r.created_at<clock_timestamp()-interval '10 minutes'
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
-- Existing execute ACLs retained; reserve now definer solely to write inaccessible pricing bindings atomically.
DO $post$ DECLARE s durable_before%ROWTYPE; sec durable_security_before%ROWTYPE; BEGIN
 SELECT * INTO s FROM durable_before; SELECT * INTO sec FROM durable_security_before;
 IF sec.tables IS DISTINCT FROM (SELECT jsonb_agg(jsonb_build_object('oid',oid,'owner',relowner,'acl',relacl,'rls',relrowsecurity) ORDER BY oid) FROM pg_class WHERE oid=ANY(sec.table_ids))
 OR sec.functions IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(p)-ARRAY['prosrc','prosecdef'] ORDER BY oid) FROM pg_proc p WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure))
 OR EXISTS(SELECT 1 FROM pg_proc WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure) AND NOT prosecdef)
 OR s.rollout IS DISTINCT FROM (SELECT to_jsonb(r)-'cap_micro_usd' FROM public_ai_budget.rollout r)
 OR s.reservations IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.reservation r)
 OR s.groups IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_group r)
 OR s.members IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_member r)
 OR s.debits IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_debit r)
 OR s.receipts IS DISTINCT FROM (SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.provider_usage_receipt r)
 OR (SELECT cap_micro_usd FROM public_ai_budget.rollout) IS DISTINCT FROM 100000000::bigint
 OR EXISTS(SELECT 1 FROM public_ai_budget.pricing_renewal_credential) OR EXISTS(SELECT 1 FROM public_ai_budget.pricing_verification) OR EXISTS(SELECT 1 FROM public_ai_budget.reservation_pricing)
 THEN RAISE EXCEPTION 'Durable migration preservation failed'; END IF;
END $post$;
COMMIT;
