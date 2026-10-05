"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { PageHelp } from "@/components/page-help";

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
  const page = getAppPageMetadata(activePage);
  const title = activePage === "home"
    ? "Insight to Action"
    : activePage === "assess-evaluate"
      ? "Assess & Evaluate"
      : page.label;

  return (
    <header ref={header} className="sticky top-0 z-30 border-b bg-card">
      <div className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-1.5 sm:px-5">
        <div className="col-span-2 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 sm:col-span-1">
          <div className="flex min-w-0 items-center gap-2">
            <h1 id="app-page-title" className="min-w-0 break-words text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {title}
            </h1>
            <PageHelp key={activePage} page={activePage} label={page.label} />
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
            <span>By Ed Om</span>
            <span aria-hidden="true">·</span>
            <a className="rounded-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" href="mailto:edwinom.nyc@gmail.com">Email</a>
            <span aria-hidden="true">·</span>
            <a className="rounded-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" href="https://www.linkedin.com/in/ed-om-62a57818" target="_blank" rel="noreferrer">LinkedIn</a>
          </p>
          <p className="text-xs leading-4 text-muted-foreground">
          Please reach out with any questions, feedback, or comments.
          </p>
        </div>
        <div className="col-start-2 row-start-2 flex items-center justify-self-end gap-3 sm:row-start-1">
          <span className="hidden text-xs font-medium text-muted-foreground md:inline">
            Perspective
          </span>
          <select
            value={selectedPersona}
            onChange={(event) => onPersonaChange(event.target.value as Persona)}
            className="h-9 min-w-28 cursor-pointer rounded-md border border-input bg-card px-3 pr-8 text-sm font-medium shadow-sm outline-none"
            aria-label="Select persona"
          >
            <option value="HR">HR</option>
            <option value="Leader">Leader</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
      </div>
      {children}
    </header>
  );
}
