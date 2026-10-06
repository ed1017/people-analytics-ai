-- READ-ONLY PREPARED AUDIT; not executed remotely by this recovery.
-- Existing authorized workforce/movement contracts only. No performance_reviews access.
-- Aggregate output only, no employee IDs or new public functions/grants.
begin read only;
select snapshot_date,count(*) population,count(distinct employee_id) distinct_employees
from public.employee_snapshots
where snapshot_date<=date '2026-09-30'
group by snapshot_date order by snapshot_date;

with original_workforce as (
 select employee_id from public.employee_snapshots where snapshot_date=date '2026-09-30'
)
select date_trunc('month',m.movement_date)::date month,m.movement_type,
 count(*) recorded_events,count(distinct m.employee_id) distinct_employees,
 min(m.movement_date) first_recorded_date,max(m.movement_date) last_recorded_date,
 count(*) filter(where m.from_job_level_id is null) missing_from_level,
 count(*) filter(where m.to_job_level_id is null) missing_to_level
from public.employee_movements m join original_workforce w using(employee_id)
where m.movement_date<date '2026-10-01'
group by 1,2 order by 1,2;

-- Distinguish the full recorded source from Sep30 survivors. Do not splice these populations.
select min(movement_date) first_recorded_date,max(movement_date) last_recorded_date,
 count(*) filter(where movement_date>=date '2026-01-01' and movement_date<date '2026-10-01') recorded_2026_ytd_events,
 count(*) filter(where movement_date>=date '2026-10-01') later_recorded_events
from public.employee_movements;
rollback;
-- Missing months are unknown coverage, not zero events.
-- No October prediction is generated: a source-completeness watermark, fixed population,
-- training/evaluation history and approved forecast definition are still needed.
