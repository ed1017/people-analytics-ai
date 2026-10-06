-- DRAFT rollback: refuses to discard any populated rating metadata.
-- If any data was populated, leave fields intact and disable the consumer instead.
begin;
set local lock_timeout = '5s';
do $$ begin
  if exists (select 1 from public.employee_snapshots where performance_rating is not null
    or performance_review_date is not null or performance_review_period is not null
    or performance_available_at is not null or performance_rating_status is not null)
  then raise exception 'Rollback blocked: preserve populated performance fields'; end if;
end $$;
alter table public.employee_snapshots
  drop constraint employee_snapshots_performance_rating_contract,
  drop column performance_rating,
  drop column performance_review_date,
  drop column performance_review_period,
  drop column performance_available_at,
  drop column performance_rating_status;
commit;
