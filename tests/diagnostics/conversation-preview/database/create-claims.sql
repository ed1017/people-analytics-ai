-- REVIEW PAYLOAD ONLY. Apply once through the authorized migration connector after GO.
-- Connector owns the transaction. No automatic startup migration or paid-row INSERT.
DO $migration$
BEGIN
  PERFORM set_config('lock_timeout','2s',true);
  PERFORM set_config('statement_timeout','10s',true);
  IF current_user <> 'postgres' OR current_setting('server_version_num')::int / 10000 <> 17 THEN
    RAISE EXCEPTION 'Unexpected migration executor or PostgreSQL major version';
  END IF;
  IF to_regclass('public.conversation_preview_claims') IS NOT NULL THEN
    RAISE EXCEPTION 'Claim relation already exists; never replace or reset it';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role' AND rolbypassrls AND NOT rolsuper)
     OR NOT has_schema_privilege('service_role','public','USAGE') THEN
    RAISE EXCEPTION 'Existing server role contract changed';
  END IF;
  CREATE TABLE public.conversation_preview_claims (
    run_id uuid PRIMARY KEY,
    claim_kind text NOT NULL,
    reservation_id uuid UNIQUE,
    manifest_sha256 text,
    overlay_commit text,
    deployment_id text NOT NULL CHECK (deployment_id ~ '^dpl_[A-Za-z0-9]{1,100}$'),
    project_id text NOT NULL CHECK (project_id='prj_qXEE4BF4KrbTbzFvDg8dc3MJQjDF'),
    ledger_receipt_sha256 text,
    reserved_microusd bigint NOT NULL,
    claimed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT exact_claim_allocation CHECK (
      (claim_kind='paid' AND run_id='45dc0c92-13b7-41c8-985e-9da7acb628f0'::uuid
        AND reservation_id IS NOT NULL AND reservation_id='d9f663b2-0556-4d76-9e20-aaa550041cec'::uuid
        AND manifest_sha256 IS NOT NULL AND manifest_sha256 ~ '^[a-f0-9]{64}$'
        AND overlay_commit IS NOT NULL AND overlay_commit ~ '^[a-f0-9]{40}$'
        AND ledger_receipt_sha256 IS NOT NULL AND ledger_receipt_sha256='6a6500e5633fea6f1e55f5b462841b57ca7e984183c167cdfd32494862311d31'
        AND reserved_microusd=23430000)
      OR
      (claim_kind='provider_free' AND run_id='6f98085e-f9be-40bf-a8a7-d46a2e538120'::uuid
        AND reservation_id IS NULL AND manifest_sha256 IS NULL AND overlay_commit IS NULL
        AND ledger_receipt_sha256 IS NULL AND reserved_microusd=0)
    )
  );
  ALTER TABLE public.conversation_preview_claims ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.conversation_preview_claims FORCE ROW LEVEL SECURITY;
  REVOKE ALL ON TABLE public.conversation_preview_claims FROM PUBLIC, anon, authenticated, service_role;
  GRANT INSERT ON TABLE public.conversation_preview_claims TO service_role;
  -- Abort the whole creation on unexpected inherited/default privileges; never edit other ACLs.
  IF EXISTS (
    SELECT 1 FROM pg_class c, LATERAL aclexplode(c.relacl) a
    WHERE c.oid='public.conversation_preview_claims'::regclass
      AND (a.grantee NOT IN ('postgres'::regrole,'service_role'::regrole)
        OR (a.grantee='service_role'::regrole AND (a.privilege_type<>'INSERT' OR a.is_grantable)))
  ) OR has_table_privilege('service_role','public.conversation_preview_claims','SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('anon','public.conversation_preview_claims','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_table_privilege('authenticated','public.conversation_preview_claims','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'Unexpected effective claim-table privileges';
  END IF;
END
$migration$;
