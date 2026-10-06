-- PREPARED ONLY. Never run remotely without parent review and old-task quiescence.
-- Default is a dry-run transaction. A reviewed administrator may choose COMMIT separately.
-- Original source tables and existing ratings release are never mutated.
begin isolation level repeatable read;
create schema career_demo_preparation_v1;
revoke all on schema career_demo_preparation_v1 from public, anon, authenticated, service_role;

create table career_demo_preparation_v1.manifest (
  version text primary key check (version = 'original-workforce-career-demo-v1'),
  generated_at timestamptz not null default clock_timestamp(),
  period_start date not null default date '2026-01-01',
  period_end date not null default date '2026-09-30',
  snapshot_date date not null default date '2026-09-30',
  active boolean not null default false check (not active),
  outcome_coverage_verified boolean not null default false check (not outcome_coverage_verified),
  provenance text not null default 'Demo eligibility and bounded level-entry dates; existing recorded promotion events reused; not real historical observations'
);
insert into career_demo_preparation_v1.manifest(version) values ('original-workforce-career-demo-v1');

do $$ begin
  if (select count(*) from public.employee_snapshots where snapshot_date=date '2026-09-30') <> 10000
    or (select count(distinct employee_id) from public.employee_snapshots where snapshot_date=date '2026-09-30') <> 10000
    then raise exception 'Expected frozen original workforce of 10000 distinct employees'; end if;
  if not exists (select 1 from public.employee_snapshots where snapshot_date=date '2025-12-31')
    then raise exception 'No opening snapshot: do not manufacture January eligibility from September headcount'; end if;
  if exists(select 1 from public.employee_snapshots group by snapshot_date,employee_id having count(*)>1)
    then raise exception 'Duplicate snapshot keys: investigate, never deduplicate silently'; end if;
end $$;

-- One row per original Sep30 employee, including unavailable eligibility and duration.
-- IDs retain their source values as text; no new workforce or movement IDs are generated.
create table career_demo_preparation_v1.career_history as
with cohort as (
 select es.employee_id::text employee_id, l.country_code, o.org_code, j.level_code,
        b.job_level_id::text baseline_level_id
 from public.employee_snapshots es
 left join public.employee_snapshots b on b.employee_id=es.employee_id and b.snapshot_date=date '2025-12-31'
 left join public.locations l on l.location_id=es.location_id
 left join public.org_units o on o.org_unit_id=es.org_unit_id
 left join public.job_levels j on j.job_level_id=es.job_level_id
 where es.snapshot_date=date '2026-09-30'
), evidence as (
 select c.*, p.event_count, p.promotion_date, p.prior_level_id,
        entry.movement_date recorded_entry_date, entry.to_level_id, entry.from_level_id, entry.at_date_count,
        bounds.first_seen, bounds.last_different,
        get_byte(decode(md5('career-eligibility-v1:'||c.employee_id),'hex'),0) < 205 generated_eligibility
 from cohort c
 left join lateral (
   select count(*) event_count, min(m.movement_date)::date promotion_date,
          min(m.from_job_level_id::text) prior_level_id
   from public.employee_movements m
   where m.employee_id::text=c.employee_id and m.movement_type='promotion'
     and m.movement_date>=date '2026-01-01' and m.movement_date<date '2026-10-01'
 ) p on true
 left join lateral (
   select m.movement_date::date, m.to_job_level_id::text to_level_id,
          m.from_job_level_id::text from_level_id,
          (select count(*) from public.employee_movements same_day
           where same_day.employee_id=m.employee_id and same_day.movement_date=m.movement_date) at_date_count
   from public.employee_movements m
   where m.employee_id::text=c.employee_id and m.movement_date<p.promotion_date
     -- An unchanged-level lateral/transfer is not a new level-entry date.
     and (m.from_job_level_id is distinct from m.to_job_level_id
          or m.from_job_level_id is null or m.to_job_level_id is null)
   order by m.movement_date desc,m.movement_id::text desc limit 1
 ) entry on true
 left join lateral (
   select min(s.snapshot_date)::date first_seen,
          max(s.snapshot_date) filter(where s.job_level_id::text<>c.baseline_level_id)::date last_different
   from public.employee_snapshots s
   where s.employee_id::text=c.employee_id and s.snapshot_date<=date '2025-12-31'
 ) bounds on true
), bounded as (
 select e.*, greatest(first_seen,coalesce(last_different+1,first_seen)) entry_lower,
   (select min(s.snapshot_date)::date from public.employee_snapshots s
    where s.employee_id::text=e.employee_id and s.job_level_id::text=e.baseline_level_id
      and s.snapshot_date>coalesce(e.last_different,date '0001-01-01')
      and s.snapshot_date<=date '2025-12-31') entry_upper
 from evidence e
), candidates as (
 select b.*,
   case when baseline_level_id is null then null else generated_eligibility end eligible,
   -- Known resets, including after opening, must never fall back to an invented older date.
   case when event_count<>1 or prior_level_id is distinct from baseline_level_id then null
     when recorded_entry_date is not null then
       case when at_date_count=1 and to_level_id=prior_level_id
         and from_level_id is not null and from_level_id<>to_level_id
         then recorded_entry_date else null end
     when entry_lower<=entry_upper then entry_lower +
       (get_byte(decode(md5('career-level-entry-v1:'||employee_id),'hex'),0) % (entry_upper-entry_lower+1))
     else null end candidate_started_on,
   case when recorded_entry_date is not null then 'recorded_movement_entry'
     else 'generated_within_observed_snapshot_bounds_v1' end candidate_provenance
 from bounded b
), prepared as (
 select c.*,
   -- Validate the entire candidate spell up to the promotion, not only the opening snapshot.
   -- Unknown levels and same-day event ordering are ambiguous, so durations stay unavailable.
   case when candidate_started_on is null then null
     when exists(select 1 from public.employee_snapshots s
       where s.employee_id::text=c.employee_id
         and s.snapshot_date>=c.candidate_started_on and s.snapshot_date<c.promotion_date
         and s.job_level_id::text is distinct from c.prior_level_id) then null
     when exists(select 1 from public.employee_movements m
       where m.employee_id::text=c.employee_id
         and m.movement_date>c.candidate_started_on and m.movement_date<c.promotion_date
         and (m.from_job_level_id::text is distinct from c.prior_level_id
           or m.to_job_level_id::text is distinct from c.prior_level_id)) then null
     when (select count(*) from public.employee_movements m
       where m.employee_id::text=c.employee_id and m.movement_date=c.promotion_date)<>1 then null
     else candidate_started_on end prior_level_started_on
 from candidates c
)
select employee_id,country_code,org_code,level_code,baseline_level_id,
 eligible,case when eligible is null then 'unavailable_no_opening_snapshot' else 'generated_demo_policy_v1' end eligibility_provenance,
 event_count recorded_promotion_events,
 case when event_count=1 then promotion_date else null end promotion_date,
 case when event_count=1 then prior_level_id else null end prior_level_id,
 prior_level_started_on,
 case when prior_level_started_on is null then 'unavailable' else candidate_provenance end duration_provenance,
 case when prior_level_started_on is not null then round((promotion_date-prior_level_started_on)::numeric/30.4375,2) else null end prior_level_months,
 case when event_count>1 then 'multiple_promotions_unsupported'
      when event_count=0 then 'no_recorded_promotion_outcome_coverage_unknown'
      when prior_level_id is distinct from baseline_level_id then 'baseline_prior_level_mismatch'
      else 'single_recorded_promotion' end outcome_status,
 false outcome_coverage_verified,
 date '2026-09-30' snapshot_date,
 date '2026-01-01' period_start,date '2026-09-30' period_end
from prepared;
alter table career_demo_preparation_v1.career_history add primary key(employee_id);
alter table career_demo_preparation_v1.career_history add check(prior_level_months is null or prior_level_months>=0);

do $$ begin
 if (select count(*) from career_demo_preparation_v1.career_history)<>10000
    or exists(select 1 from career_demo_preparation_v1.career_history where country_code is null or org_code is null or level_code is null)
 then raise exception 'Population/dimension mismatch'; end if;
 if (select count(distinct org_code) from career_demo_preparation_v1.career_history)<>8
    or exists(select 1 from career_demo_preparation_v1.career_history where org_code not in
      ('BU-CLIENTOPS','BU-CONS','BU-CORP','BU-DATAAI','BU-DIGITAL','BU-MGSVC','BU-SALES','BU-TECH'))
 then raise exception 'Unexpected BU partition'; end if;
end $$;

-- Review-only aggregate candidates; never published through a function or granted to the app.
-- Outcome coverage is unverified: true promotion_rate_pct MUST stay NULL even if event counts exist.
create table career_demo_preparation_v1.aggregate_candidates as
with bu as (
 select org_code,count(*) population,count(*) filter(where eligible) eligible,
 count(*) filter(where eligible is null) eligibility_unknown,
 count(*) filter(where eligible and recorded_promotion_events=1) recorded_promoted,
 count(*) filter(where eligible and recorded_promotion_events>1) outcome_conflicts,
 count(*) filter(where eligible and recorded_promotion_events=1 and prior_level_months is not null) duration_known,
 percentile_cont(0.5) within group(order by prior_level_months)
   filter(where eligible and recorded_promotion_events=1) candidate_median_months
 from career_demo_preparation_v1.career_history group by org_code
), gate as (
 select bool_and(eligible>=10 and population-eligible>=10 and recorded_promoted>=10
   and eligible-recorded_promoted>=10 and duration_known>=10
   and duration_known=recorded_promoted and outcome_conflicts=0 and eligibility_unknown=0) passes from bu
), groups as (
 select * from bu
 union all
 select 'all',count(*),count(*) filter(where eligible),count(*) filter(where eligible is null),
 count(*) filter(where eligible and recorded_promotion_events=1),count(*) filter(where eligible and recorded_promotion_events>1),
 count(*) filter(where eligible and recorded_promotion_events=1 and prior_level_months is not null),
 percentile_cont(0.5) within group(order by prior_level_months) filter(where eligible and recorded_promotion_events=1)
 from career_demo_preparation_v1.career_history
)
select 'all'::text country,org_code org,'all'::text level,
 'unavailable_outcome_coverage_unverified'::text status,false active,
 null::numeric promotion_rate_pct,null::numeric median_prior_level_months,
 -- All nine candidate payloads withheld together if ANY BU fails the minimum/complement/coverage gate.
 case when gate.passes then jsonb_build_object('population',population,'eligible',eligible,
   'recordedPromoted',recorded_promoted,'durationKnown',duration_known,
   'candidateMedianMonths',candidate_median_months) else null end private_candidate_counts
from groups cross join gate;
alter table career_demo_preparation_v1.aggregate_candidates add primary key(country,org,level);
alter table career_demo_preparation_v1.aggregate_candidates add check(not active);

alter table career_demo_preparation_v1.manifest enable row level security;
alter table career_demo_preparation_v1.career_history enable row level security;
alter table career_demo_preparation_v1.aggregate_candidates enable row level security;
revoke all on all tables in schema career_demo_preparation_v1 from public,anon,authenticated,service_role;
comment on schema career_demo_preparation_v1 is 'Owner-only reversible demo preparation. No publication or app access authorized.';
comment on table career_demo_preparation_v1.career_history is 'Original workforce keys; generated demo eligibility/level-entry dates never verified historical observations. Source movements unchanged.';
-- No policies, RPC, grants, performance-review reads, source writes or October projection.
rollback;
