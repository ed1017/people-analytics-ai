import {
  ChevronRight,
  Sparkles,
} from "lucide-react";

import {
  getAppPageMetadata,
} from "@/lib/app-navigation";
import type {
  AppPage,
  Persona,
} from "@/lib/types";

type AppHeaderProps = {
  activePage: AppPage;
  selectedPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
};

export function AppHeader({
  activePage,
  selectedPersona,
  onPersonaChange,
}: AppHeaderProps) {
  const page =
    getAppPageMetadata(activePage);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/95 px-5 backdrop-blur supports-[backdrop-filter]:bg-card/85">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <Sparkles className="h-4 w-4" />
        </div>        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="shrink-0 text-base font-semibold">
              Workforce AI
            </h1>
            <span className="hidden text-muted-foreground sm:inline">
              /
            </span>
            <div className="hidden min-w-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
              <span className="truncate">
                {page.section}
              </span>
              <ChevronRight className="h-3 w-3 shrink-0" />
              <span className="truncate font-medium text-foreground">
                {page.label}
              </span>
            </div>
          </div>
          <p className="hidden truncate text-xs text-muted-foreground md:block">
            People Analytics & Workforce Planning
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
          Perspective
        </span>
        <select          value={selectedPersona}
          onChange={(event) =>
            onPersonaChange(
              event.target.value as Persona
            )
          }
          className="h-9 min-w-28 cursor-pointer rounded-md border border-input bg-card px-3 pr-8 text-sm font-medium shadow-sm outline-none"
          aria-label="Select persona"
        >
          <option value="HR">HR</option>
          <option value="Leader">
            Leader
          </option>
          <option value="Finance">
            Finance
          </option>
        </select>
      </div>
    </header>
  );
}
