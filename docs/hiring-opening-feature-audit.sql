-- Read-only aggregate audit; primary October mirror is NOT the app data connection.
-- Run each statement separately. No event/employee identifiers are returned.

-- Feature availability metadata; column existence is not historical availability.
select table_name, column_name, data_type from information_schema.columns
where table_schema='workforce_october_2026'
  and table_name in ('requisitions','hires','offers','applications','positions','position_snapshots')
order by table_name,ordinal_position;

-- Search scope is the inspected October schema, not a universal absence claim.
select table_name,column_name,data_type from information_schema.columns
where table_schema='workforce_october_2026'
  and (column_name ~ '(observed|effective|revision|supersed|complete|extract)'
       or table_name ~ '(manifest|version|history|import|event)')
order by table_name,ordinal_position;

-- hiringAuditOutcome
with h as (
 select requisition_id,count(*) as hires,count(*) filter(where start_date is null) as missing_start,
 min(start_date) as first_start,max(start_date) as last_start,min(created_at) as first_insert
 from workforce_october_2026.hires group by requisition_id
)
select case when r.opened_date is null then 'missing-opening'
 when r.opened_date+90<=date '2026-10-31' then 'mature-by-cutoff' else 'immature-by-cutoff' end as maturity,
 count(*) as requisitions,sum(r.openings) as declared_openings,
 count(*) filter(where r.openings<>1 or r.openings is null) as non_single_opening,
 count(*) filter(where h.hires>1) as multiple_hire_rows,
 count(*) filter(where h.first_start<=r.opened_date+90 and h.first_start>=r.opened_date) as observed_start_by_90,
 count(*) filter(where h.first_start>r.opened_date+90) as observed_later_start,
 count(*) filter(where h.requisition_id is null) as no_hire_row,
 count(*) filter(where r.requisition_status='cancelled') as currently_cancelled,
 count(*) filter(where r.requisition_status='filled' and h.requisition_id is null) as filled_without_hire,
 count(*) filter(where r.requisition_status<>'filled' and h.requisition_id is not null) as nonfilled_with_hire,
 count(*) filter(where h.first_start<r.opened_date) as start_before_opening,
 count(*) filter(where h.first_start>date '2026-10-31') as future_start,
 count(*) filter(where r.target_start_date=h.first_start) as planned_equals_start,
 min(r.opened_date) as earliest_opening,max(r.opened_date) as latest_opening,
 min(r.created_at) as first_inserted,max(r.created_at) as last_inserted,
 count(*) filter(where r.created_at::date<=r.opened_date) as inserted_by_opening
from workforce_october_2026.requisitions r left join h using(requisition_id)
group by 1 order by 1;

-- hiringAuditFeatures
select count(*) as requisitions,
 count(*) filter(where job_profile_id is null) as missing_role,
 count(*) filter(where job_level_id is null) as missing_level,
 count(*) filter(where location_id is null) as missing_location,
 count(*) filter(where org_unit_id is null) as missing_org,
 count(*) filter(where approved_date is null) as missing_approval,
 count(*) filter(where approved_date>opened_date) as approval_after_opening,
 count(*) filter(where budgeted_salary_min is null or budgeted_salary_max is null) as missing_budget,
 count(*) filter(where budgeted_salary_min>budgeted_salary_max) as invalid_budget_range,
 count(distinct job_profile_id) as role_count,count(distinct location_id) as location_count,
 count(distinct created_at) as insertion_timestamps
from workforce_october_2026.requisitions;

-- hiringAuditQuarters
select date_trunc('quarter',r.opened_date)::date as opening_quarter,
 count(*) as requisitions,count(*) filter(where r.opened_date+90<=date '2026-10-31') as mature,
 count(*) filter(where h.start_date between r.opened_date and r.opened_date+90 and r.opened_date+90<=date '2026-10-31') as mature_start_by90,
 min(h.start_date-r.opened_date) as min_days,max(h.start_date-r.opened_date) as max_days
from workforce_october_2026.requisitions r left join workforce_october_2026.hires h using(requisition_id)
group by 1 order by 1;

-- hiringAuditLegacy
select count(*) as mature_requisitions,
count(*) filter(where h.start_date between r.opened_date and r.opened_date+90) as observed_start_by90,
count(*) filter(where h.requisition_id is null) as no_hire_row,
count(*) filter(where r.requisition_status='cancelled') as currently_cancelled,
min(r.created_at) as first_inserted,max(r.created_at) as last_inserted
from public.requisitions r left join public.hires h using(requisition_id)
where r.opened_date+90<=date '2026-09-30';
