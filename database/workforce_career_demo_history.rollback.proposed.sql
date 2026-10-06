-- Prepared rollback for ONLY the separately reviewed private preparation schema.
-- Fails if publication/access scope changed; no CASCADE or source data deletion.
begin;
do $$ begin
 if exists(select 1 from career_demo_preparation_v1.manifest where active or outcome_coverage_verified)
    or exists(select 1 from career_demo_preparation_v1.aggregate_candidates where active)
    or exists(select 1 from unnest(array['anon','authenticated','service_role']) r
      where has_schema_privilege(r,'career_demo_preparation_v1','USAGE')
         or has_table_privilege(r,'career_demo_preparation_v1.career_history','SELECT')
         or has_table_privilege(r,'career_demo_preparation_v1.aggregate_candidates','SELECT'))
 then raise exception 'Scope changed; parent must review containment before rollback'; end if;
end $$;
drop table career_demo_preparation_v1.aggregate_candidates;
drop table career_demo_preparation_v1.career_history;
drop table career_demo_preparation_v1.manifest;
drop schema career_demo_preparation_v1;
rollback;
