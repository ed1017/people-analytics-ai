-- Governed job-profile skill requirement map.
-- Used by structural position scenarios to translate roles into skill demand.

create or replace view public.position_skill_requirement_map
with (security_invoker = true)
as
select
  jp.job_profile_code,
  jp.job_profile_name,
  s.skill_code,
  s.skill_name,
  s.skill_category,
  jsr.required_proficiency,
  jsr.importance,
  jsr.weight
from public.job_skill_requirements jsr
join public.job_profiles jp
  on jp.job_profile_id =
     jsr.job_profile_id
join public.skills s
  on s.skill_id = jsr.skill_id
where jp.active = true
  and s.active = true;

grant select
on public.position_skill_requirement_map
to service_role;

grant select on
  public.job_skill_requirements,
  public.job_profiles,
  public.skills
to service_role;
