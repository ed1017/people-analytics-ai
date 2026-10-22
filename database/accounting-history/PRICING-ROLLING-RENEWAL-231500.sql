BEGIN;
SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
DO $renew$
DECLARE old_def text; new_def text; before_data jsonb; after_data jsonb; before_meta jsonb; after_meta jsonb;
BEGIN
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 LOCK TABLE public_ai_budget.reservation,public_ai_budget.settlement_group,public_ai_budget.settlement_member,public_ai_budget.settlement_debit,public_ai_budget.provider_usage_receipt IN SHARE MODE;
 IF (SELECT count(*) FROM public_ai_budget.rollout)<>1 OR NOT EXISTS(SELECT 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND cap_micro_usd=30000000 AND enabled AND policy_id='planner-20261020-multiprice-v1' AND per_call_micro_usd=4800000 AND pricing_valid_until='2026-10-22T22:51:00Z')
 OR clock_timestamp()<'2026-10-22T15:00:00Z'::timestamptz OR clock_timestamp()>='2026-10-22T22:51:00Z'::timestamptz THEN RAISE EXCEPTION 'Renewal baseline/time mismatch'; END IF;
 SELECT jsonb_build_object('rollout',(SELECT jsonb_agg(to_jsonb(r)-'pricing_valid_until') FROM public_ai_budget.rollout r),'reservations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.reservation r),'groups',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_group r),'members',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_member r),'debits',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_debit r),'receipts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.provider_usage_receipt r)) INTO before_data;
 SELECT jsonb_agg(jsonb_build_object('oid',oid,'owner',proowner,'acl',proacl,'definer',prosecdef,'config',proconfig) ORDER BY oid) INTO before_meta FROM pg_proc WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure);
 SELECT pg_get_functiondef('public.reserve_public_ai(text,text,text,bigint)'::regprocedure) INTO old_def;
 IF md5(old_def)<>'5979e026326f5d65b9fc8b1cf51db191' THEN RAISE EXCEPTION 'Admission baseline changed'; END IF;
 new_def:=replace(old_def,'2026-10-22T22:51:00Z','2026-10-23T15:00:00Z');
 IF length(old_def)-length(replace(old_def,'2026-10-22T22:51:00Z',''))<>20 THEN RAISE EXCEPTION 'Admission date count'; END IF; EXECUTE new_def;
 SELECT pg_get_functiondef('public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure) INTO old_def;
 IF md5(old_def)<>'a1e295c5ceb7cbe08430a4f51366b4ec' THEN RAISE EXCEPTION 'Settlement baseline changed'; END IF;
 new_def:=replace(old_def,'2026-10-22T22:51:00Z','2026-10-23T15:00:00Z');
 IF length(old_def)-length(replace(old_def,'2026-10-22T22:51:00Z',''))<>20 THEN RAISE EXCEPTION 'Settlement date count'; END IF; EXECUTE new_def;
 UPDATE public_ai_budget.rollout SET pricing_valid_until='2026-10-23T15:00:00Z' WHERE id='public-9037-ai-initial-v1';
 SELECT jsonb_agg(jsonb_build_object('oid',oid,'owner',proowner,'acl',proacl,'definer',prosecdef,'config',proconfig) ORDER BY oid) INTO after_meta FROM pg_proc WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure);
 SELECT jsonb_build_object('rollout',(SELECT jsonb_agg(to_jsonb(r)-'pricing_valid_until') FROM public_ai_budget.rollout r),'reservations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.reservation r),'groups',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_group r),'members',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_member r),'debits',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_debit r),'receipts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.provider_usage_receipt r)) INTO after_data;
 IF NOT EXISTS(SELECT 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND pricing_valid_until='2026-10-23T15:00:00Z') OR before_data IS DISTINCT FROM after_data OR before_meta IS DISTINCT FROM after_meta THEN RAISE EXCEPTION 'Preservation failure'; END IF;
END $renew$;
COMMIT;
