-- Read-only post-apply catalog/receipt verification, executed by the existing management connector.
SELECT c.relname, c.relowner::regrole AS owner, c.relrowsecurity, c.relforcerowsecurity,
  (SELECT count(*) FROM pg_policy p WHERE p.polrelid=c.oid) AS policy_count,
  has_table_privilege('service_role',c.oid,'INSERT') AS server_insert,
  has_table_privilege('service_role',c.oid,'SELECT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS server_other,
  has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS anon_access,
  has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS authenticated_access
FROM pg_class c WHERE c.oid='public.conversation_preview_claims'::regclass;
SELECT conname, contype, pg_get_constraintdef(oid,true) AS definition
FROM pg_constraint WHERE conrelid='public.conversation_preview_claims'::regclass ORDER BY conname;
SELECT a.attname, format_type(a.atttypid,a.atttypmod) AS type, a.attnotnull,
  pg_get_expr(d.adbin,d.adrelid) AS default_expression
FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
WHERE a.attrelid='public.conversation_preview_claims'::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum;
SELECT claim_kind, run_id, count(*) AS records
FROM public.conversation_preview_claims GROUP BY claim_kind,run_id;
