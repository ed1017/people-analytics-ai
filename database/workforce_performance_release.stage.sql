-- Approved aggregate-only release. Execute once in project noykvmztefmmhyuwuppv as postgres.
-- No individual review/snapshot grant or rating-column population. Stage is inactive.
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
create temporary table rating_release_counts on commit drop as
select org_code,count(*)::integer population,
 array[count(*) filter(where performance_rating=1),count(*) filter(where performance_rating=2),count(*) filter(where performance_rating=3),count(*) filter(where performance_rating=4),count(*) filter(where performance_rating=5)]::integer[] ratings
from rating_release_join group by org_code;
do $$ begin
 if (select count(*) from rating_release_counts)<>8 or exists(select 1 from rating_release_counts b,unnest(b.ratings)c where c<10 or b.population-c<10)
 then raise exception 'Partition or complementary suppression failed; all outputs withheld'; end if;
end $$;
create schema workforce_release authorization postgres;
revoke all on schema workforce_release from public,anon,authenticated,service_role;
create table workforce_release.performance_rating_v1 (
 org_code text primary key check(org_code in ('all','BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH')),
 payload jsonb not null check(jsonb_typeof(payload)='object' and payload - array['version','source','snapshotDate','reviewPeriod','periodKind','filters','status','availabilityKind','simulatedAvailableAt','originalAvailableAt','provenance','notRatedStatus','counts'] = '{}'::jsonb),
 source_sha256 text not null check(source_sha256='6b9ad129a9b8b24f775cd0d78895140ee8c16f2425016a9b091f3ff96cde9a60'),
 content_sha256 text not null check(content_sha256 ~ '^[a-f0-9]{64}$'),
 extracted_at timestamptz not null default transaction_timestamp(),
 activated_at timestamptz,
 active boolean not null default false
);
alter table workforce_release.performance_rating_v1 owner to postgres;
alter table workforce_release.performance_rating_v1 enable row level security;
revoke all on table workforce_release.performance_rating_v1 from public,anon,authenticated,service_role;
create policy aggregate_service_read on workforce_release.performance_rating_v1 for select to service_role using(true);
with distributions as (
 select * from rating_release_counts union all
 select 'all',sum(population)::integer,array[sum(ratings[1]),sum(ratings[2]),sum(ratings[3]),sum(ratings[4]),sum(ratings[5])]::integer[] from rating_release_counts
), bodies as (
 select org_code,jsonb_build_object(
 'version','workforce-performance-2026-ytd-bu-v1','source','employee_snapshots JOIN performance_reviews',
 'snapshotDate','2026-09-30','reviewPeriod','2026 YTD','periodKind','ytd',
 'filters',jsonb_build_object('country','all','org',org_code,'level','all'),'status','available',
 'availabilityKind','simulated_convention','simulatedAvailableAt','2026-09-30T23:59:59.999Z','originalAvailableAt',null,
 'provenance','Synthetic workforce; exact rating generation unverified','notRatedStatus','not_collected',
 'counts',jsonb_build_object('population',population,'rated',population,'ratings',ratings,'notRated',null,'unavailable',0)) payload from distributions
), digest as (select encode(sha256(convert_to(jsonb_agg(payload order by org_code)::text,'UTF8')),'hex') checksum from bodies)
insert into workforce_release.performance_rating_v1(org_code,payload,source_sha256,content_sha256)
select org_code,payload,'6b9ad129a9b8b24f775cd0d78895140ee8c16f2425016a9b091f3ff96cde9a60',checksum from bodies cross join digest;
create function workforce_release.keep_performance_rating_v1_frozen() returns trigger
language plpgsql security invoker set search_path=pg_catalog as $$ begin
 if tg_op='DELETE' then raise exception 'Preserve frozen release; deactivate instead'; end if;
 if row(new.org_code,new.payload,new.source_sha256,new.content_sha256,new.extracted_at) is distinct from row(old.org_code,old.payload,old.source_sha256,old.content_sha256,old.extracted_at)
 or old.activated_at is not null and new.activated_at is distinct from old.activated_at
 then raise exception 'Frozen release content cannot be changed'; end if;
 return new;
end $$;
revoke all on function workforce_release.keep_performance_rating_v1_frozen() from public,anon,authenticated,service_role;
create trigger keep_frozen before update or delete on workforce_release.performance_rating_v1 for each row execute function workforce_release.keep_performance_rating_v1_frozen();
create function public.workforce_performance_release_v1(p_country_code text,p_org_code text,p_level_code text) returns jsonb
language plpgsql stable security invoker set search_path=pg_catalog as $$
declare selected_org text:=coalesce(p_org_code,'all'); result jsonb;
begin
 if coalesce(p_country_code,'all')<>'all' or coalesce(p_level_code,'all')<>'all' or selected_org <> all(array['all','BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH']) then return null; end if;
 -- All nine immutable rows must be active together, with the exact frozen content digest.
 if (select count(*) from workforce_release.performance_rating_v1)<>9
 or exists(select 1 from workforce_release.performance_rating_v1 where not active or activated_at is null)
 or (select count(distinct activated_at) from workforce_release.performance_rating_v1)<>1
 or (select count(distinct content_sha256) from workforce_release.performance_rating_v1)<>1
 or (select min(content_sha256) from workforce_release.performance_rating_v1) is distinct from
    (select encode(sha256(convert_to(jsonb_agg(payload order by org_code)::text,'UTF8')),'hex') from workforce_release.performance_rating_v1)
 then return null; end if;
 -- Defense in depth: reject small categories/complements or inconsistent global totals.
 if exists(select 1 from workforce_release.performance_rating_v1 b,jsonb_array_elements_text(b.payload#>'{counts,ratings}') c where b.org_code<>'all' and (c::integer<10 or (b.payload#>>'{counts,population}')::integer-c::integer<10))
 or exists(select 1 from generate_series(0,4)i where
    (select (payload#>>array['counts','ratings',i::text])::integer from workforce_release.performance_rating_v1 where org_code='all') is distinct from
    (select sum((payload#>>array['counts','ratings',i::text])::integer) from workforce_release.performance_rating_v1 where org_code<>'all'))
 or (select (payload#>>'{counts,population}')::integer from workforce_release.performance_rating_v1 where org_code='all') is distinct from
    (select sum((payload#>>'{counts,population}')::integer) from workforce_release.performance_rating_v1 where org_code<>'all')
 then return null; end if;
 select payload || jsonb_build_object('release',jsonb_build_object('contentSha256',content_sha256,'extractedAt',to_char(extracted_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'publishedAt',to_char(activated_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))) into result
 from workforce_release.performance_rating_v1 where org_code=selected_org;
 return result;
end $$;
alter function public.workforce_performance_release_v1(text,text,text) owner to postgres;
revoke all on function public.workforce_performance_release_v1(text,text,text) from public,anon,authenticated,service_role;
grant usage on schema workforce_release to service_role;
grant select on workforce_release.performance_rating_v1 to service_role;
grant execute on function public.workforce_performance_release_v1(text,text,text) to service_role;
comment on table workforce_release.performance_rating_v1 is 'Frozen approved synthetic 2026 YTD aggregate release, company plus eight BUs only. No individual rows. Preserve history; deactivate/revoke for containment.';
comment on function public.workforce_performance_release_v1(text,text,text) is 'Invoker, service_role-only, fixed nine-signature aggregate release. No raw review access. Country/level selections return null.';
commit;
