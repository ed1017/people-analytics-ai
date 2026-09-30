-- Governed structural position inventory.
-- Applied to Supabase for Position Modeling structural actions.

create or replace view public.position_action_structural_inventory
with (security_invoker = true)
as
with current_inventory as (
  select
    p.org_unit_id,
    p.job_level_id,
    p.job_profile_id,
    count(*) filter (
      where p.position_status = 'filled'
    )::numeric as filled_positions,
    count(*) filter (
      where p.position_status = 'vacant'
    )::numeric as vacant_positions,
    count(*) filter (
      where p.position_status in ('filled','vacant')
    )::numeric as current_positions
  from public.positions p
  where p.position_status in ('filled','vacant')
  group by
    p.org_unit_id,
    p.job_level_id,
    p.job_profile_id
),
cost_basis as (
  select
    pp.org_unit_id,
    pp.job_level_id,
    pp.job_profile_id,
    sum(pp.planned_headcount)::numeric
      as planned_headcount,
    sum(pp.planned_labor_cost_usd)::numeric
      as planned_labor_cost_usd
  from public.position_plans pp
  join public.workforce_scenarios ws
    on ws.workforce_scenario_id =
       pp.workforce_scenario_id
  where ws.scenario_name = 'Baseline'
    and pp.planning_month = date '2027-12-01'
  group by
    pp.org_unit_id,
    pp.job_level_id,
    pp.job_profile_id
)
select
  ou.org_code,
  ou.org_name,
  jl.level_code,
  jl.level_name,
  jl.level_rank,
  jp.job_profile_code,
  jp.job_profile_name,
  ci.current_positions,
  ci.filled_positions,
  ci.vacant_positions,
  cb.planned_headcount,
  cb.planned_labor_cost_usd,
  round(
    cb.planned_labor_cost_usd /
    nullif(cb.planned_headcount, 0),
    2
  ) as annual_cost_per_position
from current_inventory ci
join cost_basis cb
  using (
    org_unit_id,
    job_level_id,
    job_profile_id
  )
join public.org_units ou
  on ou.org_unit_id = ci.org_unit_id
join public.job_levels jl
  on jl.job_level_id = ci.job_level_id
join public.job_profiles jp
  on jp.job_profile_id = ci.job_profile_id;

grant select
on public.position_action_structural_inventory
to service_role;
grant select on
  public.positions,
  public.position_plans,
  public.workforce_scenarios,
  public.org_units,
  public.job_levels,
  public.job_profiles
to service_role;
