-- Governed workforce response strategy signals.
-- Aggregates evidence for Build / Move / Buy / Borrow.
-- Automate remains intentionally unmodeled.

create or replace view public.workforce_response_strategy_signals
with (security_invoker = true)
as
with current_employees as (
  select distinct
    es.employee_id,
    es.job_profile_id
  from public.employee_snapshots es
  where es.snapshot_date = date '2026-09-30'
),
learning_catalog as (
  select
    lc.skill_id,
    count(*) filter (
      where lc.active
    )::integer as active_course_count,
    round(
      avg(lc.duration_hours) filter (
        where lc.active
      ),
      1
    ) as avg_course_duration_hours
  from public.learning_courses lc
  group by lc.skill_id
),
learning_pipeline as (
  select
    lc.skill_id,
    count(distinct el.employee_id) filter (
      where el.learning_status = 'Enrolled'
    )::integer as enrolled_learners,
    count(distinct el.employee_id) filter (
      where el.learning_status = 'In Progress'
    )::integer as in_progress_learners,
    count(distinct el.employee_id) filter (
      where el.learning_status = 'Completed'
        and el.completion_date >= date '2026-01-01'
    )::integer as completed_learners_ytd
  from public.employee_learning el
  join current_employees ce
    on ce.employee_id = el.employee_id
  join public.learning_courses lc
    on lc.course_id = el.course_id
  group by lc.skill_id
),
mobility as (
  select
    es.skill_id,
    count(
      distinct ce.employee_id
    )::integer as mobility_candidates
  from current_employees ce
  join public.employee_skills es
    on es.employee_id = ce.employee_id
  join public.career_preferences cp
    on cp.employee_id = ce.employee_id
  join public.job_skill_requirements desired_req
    on desired_req.job_profile_id =
       cp.desired_job_profile_id
   and desired_req.skill_id = es.skill_id
  where cp.desired_job_profile_id is not null
    and cp.desired_job_profile_id <> ce.job_profile_id
  group by es.skill_id
),
buy_history as (
  select
    jsr.skill_id,
    count(*)::integer
      as historical_filled_requisitions,
    round(
      percentile_cont(0.5) within group (
        order by (
          r.closed_date - r.opened_date
        )
      )::numeric,
      1
    ) as median_time_to_fill_days
  from public.requisitions r
  join public.job_skill_requirements jsr
    on jsr.job_profile_id = r.job_profile_id
  where r.requisition_status = 'filled'
    and r.opened_date is not null
    and r.closed_date is not null
  group by jsr.skill_id
),
borrow_signal as (
  select
    jsr.skill_id,
    count(
      distinct cw.contingent_worker_id
    ) filter (
      where cw.active
    )::integer as active_contingent_workers,
    round(
      avg(ca.bill_rate) filter (
        where cw.active
          and ca.assignment_start_date <= date '2026-09-30'
          and (
            ca.assignment_end_date is null
            or ca.assignment_end_date >= date '2026-09-30'
          )
      ),
      2
    ) as avg_active_bill_rate
  from public.contingent_workers cw
  join public.job_skill_requirements jsr
    on jsr.job_profile_id = cw.job_profile_id
  left join public.contingent_assignments ca
    on ca.contingent_worker_id =
       cw.contingent_worker_id
  group by jsr.skill_id
),
contingent_state as (
  select
    count(*)::integer
      as total_contingent_records
  from public.contingent_workers
)
select
  s.skill_code,
  s.skill_name,
  s.skill_category,
  coalesce(
    lc.active_course_count,
    0
  ) as active_course_count,
  lc.avg_course_duration_hours,
  coalesce(
    lp.enrolled_learners,
    0
  ) as enrolled_learners,
  coalesce(
    lp.in_progress_learners,
    0
  ) as in_progress_learners,
  coalesce(
    lp.completed_learners_ytd,
    0
  ) as completed_learners_ytd,
  coalesce(
    m.mobility_candidates,
    0
  ) as mobility_candidates,
  coalesce(
    bh.historical_filled_requisitions,
    0
  ) as historical_filled_requisitions,
  bh.median_time_to_fill_days,
  cs.total_contingent_records,
  coalesce(
    bs.active_contingent_workers,
    0
  ) as active_contingent_workers,
  bs.avg_active_bill_rate
from public.skills s
cross join contingent_state cs
left join learning_catalog lc
  on lc.skill_id = s.skill_id
left join learning_pipeline lp
  on lp.skill_id = s.skill_id
left join mobility m
  on m.skill_id = s.skill_id
left join buy_history bh
  on bh.skill_id = s.skill_id
left join borrow_signal bs
  on bs.skill_id = s.skill_id
where s.active = true;

grant select
on public.workforce_response_strategy_signals
to service_role;

grant select on
  public.employee_snapshots,
  public.employee_skills,
  public.career_preferences,
  public.job_skill_requirements,
  public.learning_courses,
  public.employee_learning,
  public.requisitions,
  public.contingent_workers,
  public.contingent_assignments,
  public.skills
to service_role;
