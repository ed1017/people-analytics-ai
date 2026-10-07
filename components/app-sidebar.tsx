"use client";
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
  evaluate: "Assess & Evaluate",
};

const pageIcons: Record<
  AppPage,
  LucideIcon
> = {
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
  const [openGroups,setOpenGroups]=useState<Record<string,boolean>>({analytics:true,talent:false,strategy:false,evaluate:false});
  const [previousPage,setPreviousPage]=useState(activePage);
  if(previousPage!==activePage){setPreviousPage(activePage);const section=appNavigationSections.find(s=>s.pages.includes(activePage));if(section)setOpenGroups(current=>({...current,[section.key]:true}));}
  return (
    <><div className="phone-navigation-trigger"><button type="button" popoverTarget="phone-navigation" className="min-h-11 rounded border px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring">Open navigation</button></div>
    <aside ref={drawer} id="phone-navigation" popover={phone?"auto":undefined} aria-label="Navigation drawer" onClick={event=>{if(phone&&(event.target as HTMLElement).closest('[data-nav-destination], [aria-label="Action Planning"]'))drawer.current?.hidePopover();}} className="app-sidebar sticky top-[var(--app-header-height)] h-[calc(100vh-var(--app-header-height))] overflow-y-auto border-r bg-sidebar p-3 max-md:p-2">
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
        className="space-y-4"
      >
        <Button type="button" aria-label="Action Planning" title="Action Planning" aria-current={activePage === "home" ? "page" : undefined}
          variant={activePage === "home" ? "secondary" : "ghost"} onClick={() => onPageChange("home")}
          className="mb-2 min-h-11 h-auto w-full justify-start gap-3 px-3 py-2 text-lg font-semibold max-md:justify-center max-md:px-0">
          <Sparkles className="h-5 w-5 shrink-0" />{!navCollapsed && <span className="max-md:hidden">Action Planning</span>}
        </Button>
        {appNavigationSections.map(
          (section, sectionIndex) => {
            const journey =
              appWorkspaceJourneys.find(
                (item) =>
                  item.key === section.key
              );
            const groupLabel = journey
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
                      <span className="block text-xl font-bold leading-[1.1]">
                        {workspaceDisplayTitles[section.key]}
                      </span>
                      {journey && (
                        <span className="nav-journey-subtitle mt-1 block text-sm font-medium leading-tight text-muted-foreground">
                          {journey.subtitle}
                        </span>
                      )}
                    </span>
                  )}
                  <span aria-hidden="true" className="ml-auto px-1 text-sm">{expanded?"−":"+"}</span>
                </button></h2>

                <div id={groupId} hidden={!expanded} className="space-y-1">
                  {section.pages.map(
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
                            <span className="min-w-0 whitespace-normal text-left text-[17px] font-medium leading-[1.15] max-md:hidden">
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
      </nav>
    </aside></>
  );
}
