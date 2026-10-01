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

const pageIcons: Record<
  AppPage,
  LucideIcon
> = {
  overview: LayoutDashboard,
  workforce: Users,
  attrition: TrendingDown,
  "talent-acquisition": UserPlus,
  "survey-sentiment": MessageSquareText,
  finance: DollarSign,
  skills: Sparkles,
  "learning-development": GraduationCap,
  "career-mobility": Compass,
  "succession-planning": ShieldCheck,
  "workforce-planning": CalendarDays,
};

export function AppSidebar({
  activePage,
  activeWorkspace,
  navCollapsed,
  onToggle,
  onPageChange,
  onWorkspaceChange,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto border-r bg-muted/10 p-3 max-md:p-2">
      <Button
        variant="ghost"
        className={
          navCollapsed
            ? "mb-3 w-full justify-center px-0"
            : "mb-3 w-full justify-start gap-2 max-md:justify-center max-md:px-0"
        }
        onClick={onToggle}
        title={
          navCollapsed
            ? "Expand navigation"
            : "Collapse navigation"
        }
        aria-label={
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
              Collapse navigation
            </span>
          </>
        )}
      </Button>

      <nav
        aria-label="Workforce navigation"
        className="space-y-4"
      >
        {appNavigationSections.map(
          (section, sectionIndex) => {
            const journey =
              appWorkspaceJourneys.find(
                (item) =>
                  item.key === section.key
              );
            const sectionActive =
              activeWorkspace === section.key;
            const groupLabel = journey
              ? `${section.title} — ${journey.subtitle}`
              : section.title;

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
                <button
                  type="button"
                  aria-current={
                    sectionActive
                      ? "true"
                      : undefined
                  }
                  aria-label={groupLabel}
                  title={groupLabel}
                  onClick={() =>
                    onWorkspaceChange(
                      section.key
                    )
                  }
                  className={
                    sectionActive
                      ? "mb-1.5 flex w-full items-center rounded-md bg-muted/70 px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:justify-center max-md:px-0"
                      : "mb-1.5 flex w-full items-center rounded-md px-2 py-2 text-left hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-md:justify-center max-md:px-0"
                  }
                >
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
                      <span className="block text-lg font-bold leading-tight">
                        {section.title}
                      </span>
                      {journey && (
                        <span className="mt-1 block text-sm font-medium leading-tight text-muted-foreground">
                          {journey.subtitle}
                        </span>
                      )}
                    </span>
                  )}
                </button>

                <div className="space-y-1">
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
                          variant={
                            active
                              ? "secondary"
                              : "ghost"
                          }
                          className={
                            navCollapsed
                              ? "relative w-full justify-center px-0"
                              : "relative w-full justify-start gap-3 px-3 max-md:justify-center max-md:px-0"
                          }
                          title={
                            `${metadata.label} — ${metadata.description}`
                          }
                          aria-label={
                            pageLabel
                          }
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
                            <span className="absolute left-0 h-5 w-0.5 rounded-full bg-foreground" />
                          )}
                          <Icon className="h-5 w-5 shrink-0" />
                          {!navCollapsed && (
                            <span className="truncate max-md:hidden">
                              {metadata.label}
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
    </aside>
  );
}
