-- Read-only aggregate qualification evidence, inspected 2026-10-05.
-- This is not a migration. Run each SELECT separately if the connector returns
-- only the final result in a batch. No requisition, candidate or employee IDs
-- are returned.

select count(*) as requisitions,
       count(*) filter (where openings > 1) as multi_opening_requisitions,
       sum(openings) as requested_positions,
       count(distinct job_profile_id) as job_profiles,
       count(*) filter (where approved_date is null) as missing_approval,
       count(*) filter (where opened_date is null) as missing_opening,
       count(*) filter (where target_start_date is null) as missing_planned_start,
       min(created_at) as first_inserted,
       max(created_at) as last_inserted
from public.requisitions
where opened_date < date '2026-10-01';

with cohort as (
  select r.requisition_id, r.opened_date, r.requisition_status, r.created_at,
         h.start_date, h.external_internal
  from public.requisitions r
  left join public.hires h on h.requisition_id = r.requisition_id
  where r.opened_date >= date '2024-01-01'
    and r.opened_date < date '2026-10-01'
)
select date_trunc('month', opened_date)::date as opening_month,
       count(distinct requisition_id) as distinct_openings,
       count(*) filter (where requisition_status = 'filled'
         and external_internal = 'external'
         and start_date >= opened_date
         and start_date < date '2026-10-01') as completed_external_starts,
       count(distinct requisition_id) filter (where requisition_status = 'open') as open_requisitions,
       count(distinct requisition_id) filter (where requisition_status = 'cancelled') as cancelled_requisitions,
       min(created_at) as first_recorded_at,
       max(created_at) as last_recorded_at
from cohort
group by 1 order by 1;

with by_role as (
  select job_profile_code,
         count(*) filter (where requisition_status = 'filled'
           and external_internal = 'external'
           and start_date >= opened_date
           and start_date < date '2026-10-01') as completed_external_starts
  from public.ta_requisition_metrics
  where opened_date >= date '2024-01-01'
    and opened_date < date '2026-10-01'
  group by job_profile_code
)
select count(*) as role_codes,
       min(completed_external_starts) as min_completed_per_role,
       max(completed_external_starts) as max_completed_per_role,
       percentile_cont(0.5) within group (order by completed_external_starts) as median_completed_per_role,
       count(*) filter (where completed_external_starts >= 100) as roles_with_at_least_100_completed
from by_role;

select count(*) as hires,
       count(*) filter (where hire_date < start_date) as decision_precedes_start,
       count(*) filter (where exists (
         select 1 from public.offers o
         where o.application_id = h.application_id
           and o.offer_status = 'accepted'
           and o.response_date = h.hire_date
       )) as decision_equals_accepted_response,
       count(*) filter (where exists (
         select 1 from public.requisitions r
         where r.requisition_id = h.requisition_id
           and r.target_start_date = h.start_date
       )) as planned_equals_recorded_start,
       count(*) filter (where created_at::date < start_date) as recorded_before_start,
       min(created_at) as first_inserted,
       max(created_at) as last_inserted
from public.hires h;

select table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
  and table_name ~ '(histor|revision|audit|status|stage|event|availability|vintage)'
order by table_name;
