"use client";
import {mainNavigation,mainNavigationSection} from '@/lib/workspace-navigation';
import {LimitedPreviewBadge} from "@/components/limited-preview-badge";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {WorkspacePaletteControl} from "@/components/workspace-palette-control";
import { PageHelp } from "@/components/page-help";
import {ProjectCaseStudy} from '@/components/project-case-study';

import {
  getAppPageMetadata,
} from "@/lib/app-navigation";
import type {
  AppPage,
  Persona,
} from "@/lib/types";

type AppHeaderProps = {
  children?: ReactNode;
  contextLabel?: string;
  onNavigate?: (page: AppPage) => void;
  activePage: AppPage;
  selectedPersona: Persona;
  onPersonaChange: (persona: Persona) => void;
};

export function AppHeader({
  children,
  contextLabel,
  onNavigate,
  activePage,
  selectedPersona,
  onPersonaChange,
}: AppHeaderProps) {
  const header = useRef<HTMLElement>(null);
  const aboutMenu=useRef<HTMLDetailsElement>(null);
  useEffect(()=>{if(aboutMenu.current)aboutMenu.current.open=false;},[activePage]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{const menu=aboutMenu.current;if(menu?.open&&!menu.contains(event.target as Node))menu.open=false;};
    const escape=(event:KeyboardEvent)=>{const menu=aboutMenu.current;if(event.key!=='Escape'||event.defaultPrevented||!menu?.open||(event.target as Element)?.closest('dialog[open], [popover]:popover-open'))return;menu.open=false;menu.querySelector('summary')?.focus();event.preventDefault();};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[]);
  const menuButton=useRef<HTMLButtonElement>(null);
  const [mobileMenuOpen,setMobileMenuOpen]=useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Navigation dismisses the mobile disclosure without resetting its mounted controls.
  useEffect(()=>{setMobileMenuOpen(false);},[activePage]);
  useEffect(()=>{
    if(!mobileMenuOpen)return;
    const dismiss=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.defaultPrevented||(event.target as Element)?.closest('dialog[open], [popover]:popover-open'))return;
      setMobileMenuOpen(false);menuButton.current?.focus();
    };
    document.addEventListener('keydown',dismiss);return()=>document.removeEventListener('keydown',dismiss);
  },[mobileMenuOpen]);
  useEffect(() => {
    const element=header.current; if(!element) return;
    const measure=()=>document.documentElement.style.setProperty("--app-header-height",`${element.getBoundingClientRect().height}px`);
    measure(); const observer=new ResizeObserver(measure); observer.observe(element); return ()=>observer.disconnect();
  }, []);
  const page = getAppPageMetadata(activePage);
  const title = activePage === "home"
    ? "Workforce Intelligence"
    : activePage === "assess-evaluate"
      ? "Assess & Evaluate"
      : page.label;

  const preferences=<>
        <div className="header-preferences col-start-2 row-start-2 flex min-w-0 items-center justify-self-end gap-2 sm:row-start-1">
          <span className="hidden text-xs font-medium text-muted-foreground md:inline">
            Perspective
          </span>
          <select
            value={selectedPersona}
            onChange={(event) => onPersonaChange(event.target.value as Persona)}
            className="h-9 min-w-28 cursor-pointer rounded-md border border-input bg-card px-3 pr-8 text-sm font-medium shadow-sm outline-none"
            aria-label="Select persona"
            aria-describedby="perspective-effect"
          >
            <option value="HR">HR</option>
            <option value="Leader">Leader</option>
            <option value="Finance">Finance</option>
          </select>
          <WorkspacePaletteControl/>
        </div>
        <p id="perspective-effect" className="col-span-2 text-right text-xs leading-4 text-muted-foreground">
          {selectedPersona} perspective shapes AI explanations. Figures and calculations stay the same.
        </p>
  </>;
  const contact=<>
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
  </>;
  return (
    <header ref={header} data-mobile-menu-open={mobileMenuOpen?"":undefined} className="app-top-header sticky top-0 z-30 border-b bg-card">
      <div className="calm-header-row">
        <div className="calm-brand"><h1 id="app-page-title">{title}</h1>{page.status&&<LimitedPreviewBadge/>}<PageHelp key={activePage} page={activePage} label={page.label}/></div>
        <button ref={menuButton} type="button" className="guided-mobile-menu-button" aria-expanded={mobileMenuOpen} aria-controls="guided-header-navigation guided-header-context guided-workspace-controls" onClick={()=>setMobileMenuOpen(open=>!open)}>{mobileMenuOpen?'Close workspace':'Workspace'}</button>
        <div id="guided-header-navigation" className="guided-header-navigation">
        {onNavigate&&<nav aria-label="Main navigation" className="calm-main-nav">
          {mainNavigation.map(item=><button key={item.page} type="button" aria-current={activePage===item.page?'page':mainNavigationSection(activePage)===item.key?'location':undefined} onClick={()=>onNavigate(item.page)}>{item.label}</button>)}
        </nav>}
        <details ref={aboutMenu} className="calm-header-menu"><summary>About this project</summary><div className="calm-header-popover max-h-[65dvh] overflow-y-auto">
          <h2 className="font-semibold">Workforce planning by Ed Om</h2>
          <p className="my-2 text-sm">An independently developed portfolio project, built with AI assistance. Explore workforce evidence and compare explicit planning assumptions.</p>
          <p className="my-2 text-sm">Workforce data is synthetic. Public reference data has separate sources and dates. Calculations are tested against defined contracts; scenario outputs are conditional, not verified business outcomes.</p>
          <ProjectCaseStudy/>
          {contact}
        </div></details>
        <details className="header-settings calm-header-menu"><summary>Settings</summary><div className="calm-header-popover">{preferences}<p className="mt-3 text-xs text-muted-foreground">Plans are stored in this browser. Use the saved-work controls to review storage status and manage local work.</p></div></details>
        </div>
      </div>
      <details id="guided-header-context" className="guided-header-context workspace-context"><summary>Workspace · Action Plan and filters{contextLabel&&<span className="ml-2">— {contextLabel}</span>}</summary>{children}</details>
    </header>
  );
}
