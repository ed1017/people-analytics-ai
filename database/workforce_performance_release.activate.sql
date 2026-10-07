-- Only after stage/source/grants/SQL/server/UI checks. Never refresh or reactivate silently.
begin isolation level repeatable read;
create temporary table rating_release_join on commit drop as
select s.employee_id,o.org_code,l.country_code,jl.level_code,r.performance_rating,r.review_date
from public.employee_snapshots s
left join public.performance_reviews r on r.employee_id=s.employee_id and r.review_period='2026 YTD'
left join public.org_units o using(org_unit_id)
left join public.locations l using(location_id)
left join public.job_levels jl using(job_level_id)
where s.snapshot_date=date '2026-09-30';
do $$
begin
 if current_user <> 'postgres' or current_database() <> 'postgres' then raise exception 'Unexpected release executor'; end if;
 if (select count(*) from rating_release_join) <> 10000
 or (select count(distinct employee_id) from rating_release_join) <> 10000
 or (select count(*) from public.performance_reviews where review_period='2026 YTD') <> 10000
 or (select count(distinct employee_id) from public.performance_reviews where review_period='2026 YTD') <> 10000
 or exists(select 1 from public.performance_reviews r where review_period='2026 YTD' and not exists(select 1 from rating_release_join j where j.employee_id=r.employee_id))
 or exists(select 1 from rating_release_join where performance_rating is null or performance_rating not in (1,2,3,4,5) or review_date is distinct from date '2026-09-30' or country_code is null or level_code is null or org_code is null or org_code <> all(array['BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH']))
 or exists(select 1 from rating_release_join j left join public.employees e using(employee_id) where e.source_system is distinct from 'synthetic')
 or (select encode(sha256(convert_to(string_agg(jsonb_build_array(employee_id,org_code,country_code,level_code,performance_rating,review_date)::text,E'\n' order by employee_id),'UTF8')),'hex') from rating_release_join) is distinct from '6b9ad129a9b8b24f775cd0d78895140ee8c16f2425016a9b091f3ff96cde9a60'
 then raise exception 'Frozen source validation failed; release withheld'; end if;
 if exists(select 1 from pg_roles r where r.rolname in ('service_role','anon','authenticated') and has_table_privilege(r.rolname,'public.performance_reviews','SELECT'))
 or exists(select 1 from pg_roles r where r.rolname in ('anon','authenticated') and has_table_privilege(r.rolname,'public.employee_snapshots','SELECT'))
 or not has_table_privilege('service_role','public.employee_snapshots','SELECT')
 or exists(select 1 from pg_class where oid in ('public.employee_snapshots'::regclass,'public.performance_reviews'::regclass) and not relrowsecurity)
 then raise exception 'Source access baseline changed; release withheld'; end if;
end $$;
lock table workforce_release.performance_rating_v1 in share row exclusive mode;
do $$ begin
 if current_user<>'postgres' or (select count(*) from workforce_release.performance_rating_v1)<>9
 or exists(select 1 from workforce_release.performance_rating_v1 where active or activated_at is not null)
 or (select count(distinct content_sha256) from workforce_release.performance_rating_v1)<>1
 or (select min(content_sha256) from workforce_release.performance_rating_v1) is distinct from
 (select encode(sha256(convert_to(jsonb_agg(payload order by org_code)::text,'UTF8')),'hex') from workforce_release.performance_rating_v1)
 then raise exception 'Release activation preconditions failed'; end if;
end $$;
update workforce_release.performance_rating_v1 set active=true,activated_at=transaction_timestamp();
do $$ begin
 if public.workforce_performance_release_v1(null,null,null) is null then raise exception 'Release gate rejected activation'; end if;
end $$;
commit;
