import type { ConstructedResponseFeasibility } from "@/lib/types";

export function ConstructedResponseFeasibilitySummary({ data }: { data?: ConstructedResponseFeasibility }) {
  if (!data) return null;
  return (
    <section aria-label="Constructed response feasibility" className="my-3 rounded-md border p-3 text-sm">
      <p className="font-medium">Staffing feasibility: Not assessed</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Coverage is conditional on executing the entered allocation. Profile fit, course availability and historical hiring do not confirm future staffing.
      </p>
      <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
        {["Assessed readiness", "Available movers", "Release capacity", "Build capacity", "Future hiring capacity", "Confirmed coverage", "Time to readiness", "Scheduled coverage", "Deadline feasibility"].map(label => (
          <div key={label}><dt>{label}</dt><dd className="font-medium">Unknown</dd></div>
        ))}
      </dl>
    </section>
  );
}
