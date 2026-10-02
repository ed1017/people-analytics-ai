"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { PageHelp } from "@/components/page-help";
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
  children?: ReactNode;
  activePage: AppPage;
  selectedPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
};

export function AppHeader({
  children,
  activePage,
  selectedPersona,
  onPersonaChange,
}: AppHeaderProps) {
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    const element=header.current; if(!element) return;
    const measure=()=>document.documentElement.style.setProperty("--app-header-height",`${element.getBoundingClientRect().height}px`);
    measure(); const observer=new ResizeObserver(measure); observer.observe(element); return ()=>observer.disconnect();
  }, []);
  const page =
    getAppPageMetadata(activePage);

  return (
    <header ref={header} className="sticky top-0 z-30 border-b bg-card"><div className="flex h-16 items-center justify-between px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40">
          <Sparkles className="h-4 w-4" />
        </div>        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 text-sm font-semibold leading-tight sm:text-base">
              Insights to Action
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
            <PageHelp key={activePage} page={activePage} label={page.label} />
          </div>
          <p className="hidden truncate text-xs text-muted-foreground md:block">
            People Analytics & Workforce Planning
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
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
    </div>{children}</header>
  );
}
