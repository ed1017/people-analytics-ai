BEGIN;
SET LOCAL statement_timeout='10s';
SET LOCAL lock_timeout='2s';
DO $cap$
DECLARE before_data jsonb; after_data jsonb; before_meta jsonb; after_meta jsonb; old_def text; new_def text;
BEGIN
 PERFORM 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' FOR UPDATE;
 LOCK TABLE public_ai_budget.reservation,public_ai_budget.settlement_group,public_ai_budget.settlement_member,public_ai_budget.settlement_debit,public_ai_budget.provider_usage_receipt IN SHARE MODE;
 IF (SELECT count(*) FROM public_ai_budget.rollout)<>1 OR NOT EXISTS(SELECT 1 FROM public_ai_budget.rollout WHERE id='public-9037-ai-initial-v1' AND cap_micro_usd=30000000 AND policy_id='planner-20261020-multiprice-v1' AND per_call_micro_usd=4800000)
 OR (SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='public_ai_budget.rollout'::regclass AND conname='rollout_cap_micro_usd_check') IS DISTINCT FROM 'CHECK ((cap_micro_usd = 30000000))'
 THEN RAISE EXCEPTION 'Reviewed cap baseline changed'; END IF;
 SELECT pg_get_functiondef('public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure) INTO old_def;
 IF md5(old_def)<>'1eeb9611c6ae13e268358cd3ad90e46f' OR length(old_def)-length(replace(old_def,'cap_micro_usd=30000000',''))<>22 THEN RAISE EXCEPTION 'Reviewed settlement baseline changed'; END IF;
 SELECT jsonb_build_object('rollout',(SELECT jsonb_agg(to_jsonb(r)-'cap_micro_usd') FROM public_ai_budget.rollout r),'reservations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.reservation r),'groups',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_group r),'members',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_member r),'debits',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_debit r),'receipts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.provider_usage_receipt r)) INTO before_data;
 SELECT jsonb_agg(to_jsonb(p)-'prosrc' ORDER BY oid) INTO before_meta FROM pg_proc p WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure);
 ALTER TABLE public_ai_budget.rollout DROP CONSTRAINT rollout_cap_micro_usd_check;
 UPDATE public_ai_budget.rollout SET cap_micro_usd=50000000 WHERE id='public-9037-ai-initial-v1';
 ALTER TABLE public_ai_budget.rollout ADD CONSTRAINT rollout_cap_micro_usd_check CHECK (cap_micro_usd=50000000);
 new_def:=replace(old_def,'cap_micro_usd=30000000','cap_micro_usd=50000000'); EXECUTE new_def;
 SELECT jsonb_agg(to_jsonb(p)-'prosrc' ORDER BY oid) INTO after_meta FROM pg_proc p WHERE oid IN ('public.reserve_public_ai(text,text,text,bigint)'::regprocedure,'public.settle_public_ai_call(text,text,text,jsonb)'::regprocedure);
 SELECT jsonb_build_object('rollout',(SELECT jsonb_agg(to_jsonb(r)-'cap_micro_usd') FROM public_ai_budget.rollout r),'reservations',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.reservation r),'groups',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_group r),'members',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_member r),'debits',(SELECT jsonb_agg(to_jsonb(r) ORDER BY to_jsonb(r)::text) FROM public_ai_budget.settlement_debit r),'receipts',(SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM public_ai_budget.provider_usage_receipt r)) INTO after_data;
 IF before_meta IS DISTINCT FROM after_meta OR before_data IS DISTINCT FROM after_data OR NOT EXISTS(SELECT 1 FROM public_ai_budget.rollout WHERE cap_micro_usd=50000000) THEN RAISE EXCEPTION 'Cap preservation check failed'; END IF;
END $cap$;
COMMIT;
