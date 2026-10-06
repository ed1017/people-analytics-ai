-- LOCAL / DBA REVIEW ONLY. Not installed as an RPC or called by any app route.
-- Parameters match existing top filters: country, business unit, level; null = All.
-- Population is exactly the 2026-09-30 dashboard snapshot (no new eligibility rule).
-- A privacy-reviewed finite release allowlist is still required before public use.
with selected as (
  select es.performance_rating, es.performance_rating_status,
    es.performance_review_period, es.performance_review_date, es.performance_available_at
  from public.employee_snapshots es
  where es.snapshot_date = date '2026-09-30'
    and ($1::text is null or es.location_id in
      (select location_id from public.locations where country_code = $1))
    and ($2::text is null or es.org_unit_id =
      (select org_unit_id from public.org_units where org_code = $2 limit 1))
    and ($3::text is null or es.job_level_id =
      (select job_level_id from public.job_levels where level_code = $3 limit 1))
), classified as (
  select case when performance_review_period = '2026 YTD'
      and performance_review_date <= date '2026-09-30'
      and performance_available_at <= timestamptz '2026-09-30 23:59:59.999+00'
    then case when performance_rating_status = 'rated' then performance_rating
              when performance_rating_status = 'not_rated' then 0 end
    end as rating
  from selected
), counts as (
  select count(*)::integer as population,
    count(*) filter (where rating is null)::integer as unavailable,
    count(*) filter (where rating = 0)::integer as not_rated,
    array[count(*) filter(where rating = 1), count(*) filter(where rating = 2),
      count(*) filter(where rating = 3), count(*) filter(where rating = 4),
      count(*) filter(where rating = 5)]::integer[] as ratings
  from classified
), guarded as (
  select *, case when population = 0 then 'unavailable'
    when population < 10 or exists (select 1 from unnest(ratings || array[unavailable,not_rated]) n where n between 1 and 9)
      then 'suppressed' else 'available' end as status from counts
)
select jsonb_build_object(
  'source', 'employee_snapshots.performance_rating', 'snapshotDate', '2026-09-30',
  'reviewPeriod', '2026 YTD', 'periodKind', 'ytd',
  'filters',jsonb_build_object('country',coalesce($1,'all'),'org',coalesce($2,'all'),'level',coalesce($3,'all')),
  'status',status,
  'counts',case when status = 'available' then jsonb_build_object(
    'population',population,'ratings',ratings,'notRated',not_rated,'unavailable',unavailable) else null end
) as performance_rating from guarded;
