"use client";
import {planningJourney,planningEvidence} from "@/lib/planning-journey";
import {LimitedPreviewBadge} from "@/components/limited-preview-badge";
import {useRef,useState} from "react";
import {usePhoneLayout} from "@/components/use-phone-layout";
import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  Compass,
  DollarSign,
  GraduationCap,
  LayoutDashboard,
  MessageSquareText,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  appNavigationSections,
  appWorkspaceJourneys,
  getAppPageMetadata,
  type AppWorkspaceKey,
} from "@/lib/app-navigation";
import type { AppPage } from "@/lib/types";

type AppSidebarProps = {
  activePage: AppPage;
  activeWorkspace: AppWorkspaceKey;
  navCollapsed: boolean;
  onToggle: () => void;
  onPageChange: (page: AppPage) => void;
  onWorkspaceChange: (
    workspace: AppWorkspaceKey
  ) => void;
};

const workspaceDisplayTitles: Record<
  AppWorkspaceKey,
  string
> = {
  analytics: "Workforce",
  talent: "Intelligence",
  strategy: "Planning",
  evaluate: "More",
};

const pageIcons: Record<
  AppPage,
  LucideIcon
> = {
  "future-of-work": Sparkles,
  "action-plans": CalendarDays,
  "plan-track": TrendingUp,
  "decision-brief": MessageSquareText,
  "assess-evaluate": ShieldCheck,
  "occupational-references": Compass,
  "labor-market": TrendingUp,
  "training-coaching": GraduationCap,
  "development-planning": GraduationCap,
  home: Sparkles,
  overview: LayoutDashboard,
  workforce: Users,
  attrition: TrendingDown,
  compensation: DollarSign,
  "talent-acquisition": UserPlus,
  "survey-sentiment": MessageSquareText,
  finance: DollarSign,
  skills: Sparkles,
  "learning-development": GraduationCap,
  "career-mobility": Compass,
  "career-growth-mobility": TrendingUp,
  "succession-planning": ShieldCheck,
  "planning-overview": LayoutDashboard,
  "scenario-modeling": CalendarDays,
  "position-workforce-design": Users,
  "workforce-response": TrendingUp,
  "execution-feasibility": ShieldCheck,
  "workforce-planning": CalendarDays,
};

export function AppSidebar({
  activePage,
  navCollapsed: desktopNavCollapsed,
  onToggle,
  onPageChange,
}: AppSidebarProps) {
  const phone=usePhoneLayout(),drawer=useRef<HTMLElement>(null),navCollapsed=phone?false:desktopNavCollapsed;
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>({[appNavigationSections.find(section=>section.pages.includes(activePage))?.key??'']:activePage!=='home'}));
  const primaryPage=activePage==="home"||planningJourney.some(step=>step.page===activePage)||activePage==="workforce-planning";
  const [exploreOpen,setExploreOpen]=useState(!primaryPage);
  const [previousPage,setPreviousPage]=useState(activePage);
  if(previousPage!==activePage){setPreviousPage(activePage);if(!primaryPage)setExploreOpen(true);const section=appNavigationSections.find(s=>s.pages.includes(activePage));if(section)setOpenGroups(current=>({...current,[section.key]:true}));}
  return (
    <><div className="phone-navigation-trigger"><button type="button" popoverTarget="phone-navigation" className="min-h-11 rounded border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring">Open navigation</button></div>
    <aside ref={drawer} id="phone-navigation" popover={phone?"auto":undefined} aria-label="Navigation drawer" onClick={event=>{if(phone&&(event.target as HTMLElement).closest('[data-nav-destination], [aria-label="Overview"]'))drawer.current?.hidePopover();}} className="app-sidebar sticky top-[var(--app-header-height)] h-[calc(100vh-var(--app-header-height))] overflow-y-auto border-r bg-sidebar p-3 max-md:p-2">
      <Button
        variant="ghost"
        className={
          navCollapsed
            ? "mb-3 w-full justify-center px-0"
            : "mb-3 w-full justify-start gap-2 max-md:justify-center max-md:px-0"
        }
        onClick={()=>phone?drawer.current?.hidePopover():onToggle()}
        title={phone?"Close navigation":
          navCollapsed
            ? "Expand navigation"
            : "Collapse navigation"
        }
        aria-label={phone?"Close navigation":
          navCollapsed
            ? "Expand navigation"
            : "Collapse navigation"
        }
      >
        {navCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <>
            <PanelLeftClose className="h-5 w-5" />
            <span className="max-md:hidden">
              {phone?"Close navigation":"Collapse navigation"}
            </span>
          </>
        )}
      </Button>

      <nav
        aria-label="Workforce navigation"
        className="space-y-1"
      >
        {[{page:'home' as AppPage,label:'Overview'},...planningJourney].map(item=>{
          const Icon=pageIcons[item.page];
          const active=activePage===item.page||(item.page==='planning-overview'&&activePage==='workforce-planning');
          return <Button key={item.page} type="button" data-nav-destination={item.page} aria-label={item.label} title={item.label} aria-current={active?'page':undefined} variant={active?'secondary':'ghost'} onClick={()=>onPageChange(item.page)} className={`h-auto min-h-11 w-full gap-3 px-3 py-2 text-sm ${navCollapsed?'justify-center':'justify-start'}`}>
            <Icon className="h-4 w-4 shrink-0"/>{!navCollapsed&&<span className="whitespace-normal text-left">{item.label}</span>}
          </Button>;
        })}
        <section aria-label="Explore evidence" className="border-t pt-3">
          {!navCollapsed&&<h2 className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Explore evidence</h2>}
          {planningEvidence.map(item=>{const Icon=pageIcons[item.page];return <Button key={item.page} type="button" data-nav-destination={item.page} title={item.label} aria-label={item.label} aria-current={activePage===item.page?'page':undefined} variant={activePage===item.page?'secondary':'ghost'} onClick={()=>onPageChange(item.page)} className={`min-h-10 w-full gap-3 px-3 text-sm text-muted-foreground ${navCollapsed?'justify-center':'justify-start'}`}><Icon className="h-4 w-4 shrink-0"/>{!navCollapsed&&<span>{item.label}</span>}</Button>})}
        </section>
        <section aria-label="Explore tools" className="border-t pt-2">
          <button type="button" aria-label="More evidence and tools" aria-expanded={exploreOpen} aria-controls="explore-navigation" onClick={()=>setExploreOpen(value=>!value)} className="flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-left font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
            <Compass className="h-5 w-5 shrink-0" />{!navCollapsed && <span>More</span>}<span aria-hidden="true" className="ml-auto">{exploreOpen?"−":"+"}</span>
          </button>
          <div id="explore-navigation" hidden={!exploreOpen}>
        {appNavigationSections.map(
          (section, sectionIndex) => {
            const journey =
              appWorkspaceJourneys.find(
                (item) =>
                  item.key === section.key
              );
            const groupLabel = section.key==='evaluate'?'More — Assess & Evaluate, coming soon':journey
              ? `${section.title} — ${journey.subtitle}`
              : section.title;

            const expanded=Boolean(openGroups[section.key]);
            const groupId="navigation-"+section.key;
            return (
              <section
                key={section.key}
                aria-label={groupLabel}
                className={
                  sectionIndex === 0
                    ? ""
                    : "border-t pt-4"
                }
              >
                <h2 className="mb-1.5"><button type="button" aria-label={groupLabel} aria-expanded={expanded} aria-controls={groupId} onClick={()=>setOpenGroups(current=>({...current,[section.key]:!expanded}))} className="nav-group-label flex min-h-11 w-full items-center rounded px-2 py-2 text-left hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring max-md:justify-center max-md:px-0">
                  <span
                    aria-hidden="true"
                    className={
                      navCollapsed
                        ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold"
                        : "hidden h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold max-md:flex"
                    }
                  >
                    {sectionIndex + 1}
                  </span>

                  {!navCollapsed && (
                    <span className="min-w-0 max-md:hidden">
                      <span className={section.key==='evaluate'?"block text-sm font-medium":"block text-sm font-semibold leading-tight"}>
                        {workspaceDisplayTitles[section.key]}
                      </span>
                      {journey && section.key!=='evaluate' && (
                        <span className="nav-journey-subtitle mt-1 block text-sm font-medium leading-tight text-muted-foreground">
                          {journey.subtitle}
                        </span>
                      )}
                    </span>
                  )}
                  <span aria-hidden="true" className="ml-auto px-1 text-sm">{expanded?"−":"+"}</span>
                </button></h2>

                <div id={groupId} hidden={!expanded} className="space-y-1">
                  {section.pages.filter(page=>!planningJourney.some(item=>item.page===page)&&!planningEvidence.some(item=>item.page===page)).map(
                    (page) => {
                      const metadata =
                        getAppPageMetadata(
                          page
                        );
                      const Icon =
                        pageIcons[page];
                      const active =
                        activePage === page;
                      const pageLabel =
                        `${section.title} — ${metadata.label}`;

                      return (
                        <Button
                          key={page}
                          data-nav-destination={page}
                          variant={
                            active
                              ? "secondary"
                              : "ghost"
                          }
                          className={
                            navCollapsed
                              ? "relative w-full justify-center px-0"
                              : "relative h-auto min-h-10 w-full justify-start gap-3 px-3 py-2.5 max-md:justify-center max-md:px-0"
                          }
                          title={
                            `${metadata.label}${metadata.status?" — "+metadata.status:""} — ${metadata.description}`
                          }
                          aria-label={
                            pageLabel
                          }
                          aria-describedby={metadata.status?`nav-preview-${page}`:undefined}
                          aria-current={
                            active
                              ? "page"
                              : undefined
                          }
                          onClick={() =>
                            onPageChange(
                              page
                            )
                          }
                        >
                          {active && (
                            <span className="absolute left-0 h-6 w-1 rounded-full bg-primary" />
                          )}
                          <Icon className="h-5 w-5 shrink-0" />
                          {navCollapsed&&metadata.status&&<span id={`nav-preview-${page}`} className="sr-only">Limited preview</span>}
                          {!navCollapsed && (
                            <span className="min-w-0 whitespace-normal text-left text-sm font-medium leading-[1.15] max-md:hidden">
                              {metadata.label}
                              {metadata.status&&<span className="mt-1 block"><LimitedPreviewBadge id={`nav-preview-${page}`}/></span>}
                            </span>
                          )}
                        </Button>
                      );
                    }
                  )}
                </div>
              </section>
            );
          }
        )}
          </div>
        </section>
      </nav>
    </aside></>
  );
}
