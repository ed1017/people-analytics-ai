-- Stop further reads while preserving the release and audit timestamps. Prior downloads cannot be recalled.
begin;
update workforce_release.performance_rating_v1 set active=false;
revoke execute on function public.workforce_performance_release_v1(text,text,text) from service_role;
revoke select on workforce_release.performance_rating_v1 from service_role;
revoke usage on schema workforce_release from service_role;
commit;
-- Current main has no environment kill switch. If needed, remove the aggregate RPC call in a reviewed route change and redeploy.
-- The dashboard route and fetches use no-store; a fresh fetch clears the browser copy.
-- Already open or downloaded responses cannot be withdrawn retroactively.
