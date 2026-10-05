-- Read-only evidence reproduction, inspected 2026-10-05. Never a migration.
-- Only aggregate outputs and definitions; no individual identifiers are returned.
-- Execute statements separately when a connector returns only its final result set.

select schemaname, viewname, definition
from pg_views
where schemaname = 'public'
  and viewname in ('attrition_monthly_trend', 'attrition_current_summary');

select month, total_exits, voluntary_exits, involuntary_exits
from public.attrition_monthly_trend
order by month;

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('separations', 'employee_snapshots')
order by table_name, ordinal_position;

select date_trunc('month', separation_date)::date as month,
       count(*) as total_exits,
       count(*) filter (where separation_type = 'voluntary') as voluntary_exits,
       min(separation_date) as first_event,
       max(separation_date) as last_event,
       min(created_at) as first_inserted,
       max(created_at) as last_inserted,
       count(*) - count(distinct (employee_id, separation_date)) as duplicate_employee_dates,
       count(*) filter (where employee_id is null or separation_date is null or separation_type is null) as incomplete_keys
from public.separations
group by 1 order by 1;

select date_trunc('month', snapshot_date)::date as month,
       min(snapshot_date) as first_snapshot_date,
       max(snapshot_date) as last_snapshot_date,
       count(distinct snapshot_date) as snapshot_dates,
       count(*) as snapshot_rows,
       count(distinct employee_id) as headcount
from public.employee_snapshots
group by 1 order by 1;

select min(snapshot_date) as first_snapshot,
       max(snapshot_date) as last_snapshot,
       count(distinct snapshot_date) as snapshot_dates,
       min(created_at) as first_inserted,
       max(created_at) as last_inserted,
       count(*) filter (where snapshot_date <> (date_trunc('month', snapshot_date) + interval '1 month -1 day')::date) as non_month_end_rows,
       count(*) - count(distinct (employee_id, snapshot_date)) as duplicate_employee_dates
from public.employee_snapshots;

select date_trunc('month', s.separation_date)::date as month,
       count(*) filter (where s.separation_type = 'voluntary') as voluntary_exits,
       count(*) filter (where s.separation_type = 'voluntary' and not exists (
         select 1 from public.employee_snapshots es
         where es.employee_id = s.employee_id
           and es.snapshot_date = (date_trunc('month', s.separation_date) - interval '1 day')::date
       )) as voluntary_without_prior_month_snapshot,
       count(*) filter (where s.separation_type = 'voluntary' and exists (
         select 1 from public.employee_snapshots es
         where es.employee_id = s.employee_id
           and es.snapshot_date = (date_trunc('month', s.separation_date) + interval '1 month -1 day')::date
       )) as voluntary_in_exit_month_end_snapshot
from public.separations s
where s.separation_date >= date '2024-02-01' and s.separation_date <= date '2026-09-30'
group by 1 order by 1;
