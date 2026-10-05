-- Read-only metadata and aggregate evidence for predictive-analytics-roadmap.md.
-- Inspected 2026-10-05. Not a migration or an application data/model adapter.
-- Run statements separately when the connector returns only its final result.

select t.table_name, t.table_type,
       string_agg(c.column_name || ' [' || c.data_type || ']', ', ' order by c.ordinal_position) as columns
from information_schema.tables t
join information_schema.columns c on c.table_schema = t.table_schema and c.table_name = t.table_name
where t.table_schema = 'public'
  and t.table_name in ('compensation', 'pay_adjustments', 'employee_movements', 'employee_learning',
    'employee_skills', 'employee_certifications', 'performance_reviews', 'employee_snapshots',
    'requisitions', 'applications', 'interviews', 'offers', 'hires', 'labor_costs', 'fx_rates',
    'position_snapshots', 'contingent_assignments', 'data_quality_results', 'synthetic_history_targets',
    'ta_requisition_metrics', 'dashboard_headcount_trend', 'workforce_movement_summary')
group by t.table_name, t.table_type order by t.table_name;

select string_agg(table_name, ', ' order by table_name) as public_base_tables
from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';

select viewname, definition from pg_views
where schemaname = 'public' and viewname = 'ta_requisition_metrics';

with periods(label, starts) as (values
  ('last-12-months', date '2025-10-01'),
  ('last-24-months', date '2024-10-01'),
  ('all-available', date '1900-01-01'))
select p.label, count(*) as requisitions_opened,
       count(*) filter (where r.requisition_status = 'filled') as currently_filled,
       count(*) filter (where r.requisition_status = 'open') as currently_open,
       count(*) filter (where r.requisition_status = 'cancelled') as currently_cancelled,
       min(r.opened_date) as first_opening, max(r.opened_date) as last_opening,
       min(r.created_at) as first_inserted, max(r.created_at) as last_inserted
from periods p join public.requisitions r on r.opened_date >= p.starts and r.opened_date < date '2026-10-01'
group by p.label order by p.label;

with periods(label, starts) as (values
  ('last-12-months', date '2025-10-01'),
  ('last-24-months', date '2024-10-01'),
  ('all-available', date '1900-01-01'))
select p.label, count(*) as metric_rows, count(distinct t.requisition_id) as distinct_requisitions,
       count(*) filter (where t.external_internal = 'external' and t.requisition_status = 'filled'
         and t.start_date >= t.opened_date and t.start_date < date '2026-10-01') as completed_external_start_pairs,
       count(*) filter (where t.requisition_status = 'filled' and t.start_date is null) as filled_without_start,
       count(*) filter (where t.start_date >= date '2026-10-01') as future_starts,
       min(t.opened_date) as first_opening, max(t.opened_date) as last_opening
from periods p join public.ta_requisition_metrics t on t.opened_date >= p.starts and t.opened_date < date '2026-10-01'
group by p.label order by p.label;

select count(*) as hires,
       count(*) filter (where hire_date is null) as missing_hire_date,
       count(*) filter (where start_date is null) as missing_start_date,
       count(*) filter (where hire_date = start_date) as same_hire_and_start,
       count(*) filter (where hire_date < start_date) as hire_before_start,
       count(*) filter (where hire_date > start_date) as hire_after_start,
       min(hire_date) as earliest_hire, max(hire_date) as latest_hire,
       min(start_date) as earliest_start, max(start_date) as latest_start,
       min(created_at) as first_inserted, max(created_at) as last_inserted
from public.hires;

select count(*) as hires,
       count(*) filter (where exists (select 1 from public.offers o where o.application_id = h.application_id
         and o.offer_status = 'accepted' and o.response_date = h.hire_date)) as hire_date_matches_accepted_offer_response,
       count(*) filter (where exists (select 1 from public.requisitions r where r.requisition_id = h.requisition_id
         and r.target_start_date = h.start_date)) as planned_start_equals_actual_start,
       min(h.start_date - h.hire_date) as min_hire_to_start_days,
       max(h.start_date - h.hire_date) as max_hire_to_start_days
from public.hires h;

select c.relname as table_name, a.attname as column_name, col_description(c.oid, a.attnum) as definition
from pg_class c join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
where n.nspname = 'public' and (
  (c.relname = 'hires' and a.attname in ('hire_date', 'start_date', 'created_at')) or
  (c.relname = 'requisitions' and a.attname in ('approved_date', 'opened_date', 'target_start_date', 'closed_date')) or
  (c.relname = 'offers' and a.attname in ('offer_date', 'response_date')))
order by c.relname, a.attnum;
