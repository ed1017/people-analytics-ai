import {
  appWorkspaceJourneys,
  type AppWorkspaceKey,
} from "@/lib/app-navigation";

type WorkspaceJourneyToolbarProps = {
  activeWorkspace: AppWorkspaceKey;
  onWorkspaceChange: (
    workspace: AppWorkspaceKey
  ) => void;
};

export function WorkspaceJourneyToolbar({
  activeWorkspace,
  onWorkspaceChange,
}: WorkspaceJourneyToolbarProps) {
  return (
    <nav
      aria-label="Workforce journey"
      className="border-b bg-background/95 px-2 py-2 sm:px-4"
    >
      <ol className="mx-auto grid max-w-[1180px] grid-cols-3 gap-1.5 sm:gap-2">
        {appWorkspaceJourneys.map(
          (workspace, index) => {
            const active =
              workspace.key === activeWorkspace;

            const accessibleLabel =
              `${index + 1}. ${workspace.journeyLabel} — ${workspace.subtitle}`;

            return (
              <li
                key={workspace.key}
                className="min-w-0"
              >
                <button
                  type="button"
                  aria-current={
                    active ? "page" : undefined
                  }
                  aria-label={accessibleLabel}
                  title={accessibleLabel}
                  onClick={() =>
                    onWorkspaceChange(
                      workspace.key
                    )
                  }
                  className={
                    active
                      ? "flex min-h-16 w-full min-w-0 items-center gap-2 rounded-lg border bg-foreground px-2.5 py-2 text-left text-background shadow-sm sm:min-h-14 sm:px-3"
                      : "flex min-h-16 w-full min-w-0 items-center gap-2 rounded-lg border bg-background px-2.5 py-2 text-left transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring sm:min-h-14 sm:px-3"
                  }
                >
                  <span
                    aria-hidden="true"
                    className={
                      active
                        ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-background/40 text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs"
                        : "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-muted/40 text-[11px] font-semibold sm:h-7 sm:w-7 sm:text-xs"
                    }
                  >
                    {index + 1}
                  </span>

                  <span className="min-w-0">
                    <span className="block text-[11px] font-semibold leading-[1.15] sm:text-sm sm:leading-tight">
                      {workspace.journeyLabel}
                    </span>
                    <span
                      className={
                        active
                          ? "mt-1 block text-[9px] leading-tight text-background/75 sm:text-[11px]"
                          : "mt-1 block text-[9px] leading-tight text-muted-foreground sm:text-[11px]"
                      }
                    >
                      {workspace.subtitle}
                    </span>
                  </span>
                </button>
              </li>
            );
          }
        )}
      </ol>
    </nav>
  );
}