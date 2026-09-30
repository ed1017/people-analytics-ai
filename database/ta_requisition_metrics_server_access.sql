-- Server-only governed access for role-level recruiting feasibility.
-- Keeps the requisition analytics view unavailable to anon/authenticated.

alter view public.ta_requisition_metrics
set (security_invoker = true);

grant select on
  public.job_functions,
  public.locations
to service_role;

grant select
on public.ta_requisition_metrics
to service_role;

revoke select
on public.ta_requisition_metrics
from anon, authenticated;
