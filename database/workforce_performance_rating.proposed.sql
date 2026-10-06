-- DRAFT 2026-10-06. NOT APPLIED. No source backfill or access changes.
-- CLI migration creation is blocked by the CLI binary download (EAI_AGAIN).
-- Generate the final migration with `supabase migration new workforce_performance_rating`
-- after approval; retain this proposal outside the automatic migration directory.
begin;
set local lock_timeout = '5s';
alter table public.employee_snapshots
  add column performance_rating smallint,
  add column performance_review_date date,
  add column performance_review_period text,
  add column performance_available_at timestamptz,
  add column performance_rating_status text,
  add constraint employee_snapshots_performance_rating_contract check (
    (performance_rating_status is null and performance_rating is null
      and performance_review_date is null and performance_review_period is null
      and performance_available_at is null)
    or
    (performance_rating_status is not null
      and performance_rating_status in ('rated', 'not_rated')
      and performance_review_date is not null
      and performance_review_date <= snapshot_date
      and performance_review_period is not null
      and length(trim(performance_review_period)) between 1 and 80
      and performance_available_at is not null
      and performance_available_at >= performance_review_date::timestamp at time zone 'UTC'
      and ((performance_rating_status = 'rated' and performance_rating is not null
            and performance_rating between 1 and 5)
        or (performance_rating_status = 'not_rated' and performance_rating is null)))
  );
comment on column public.employee_snapshots.performance_rating is
  'Nullable ordinal rating 1-5 on this existing workforce snapshot. No inferred category, average, effect or synthetic backfill. Null is not zero.';
comment on column public.employee_snapshots.performance_rating_status is
  'Null: source/availability not established. rated: verified released review. not_rated: explicitly verified absence for the declared review period; never inferred from missing ingestion.';
comment on column public.employee_snapshots.performance_available_at is
  'Verified release/availability timestamp, separate from review date. Unknown remains null with the whole rating field unavailable; never inferred from created_at.';
commit;
