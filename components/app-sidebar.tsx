import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  DollarSign,
  LayoutDashboard,
  MessageSquareText,
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
  getAppPageMetadata,
} from "@/lib/app-navigation";
import type { AppPage } from "@/lib/types";

type AppSidebarProps = {
  activePage: AppPage;
  navCollapsed: boolean;
  onToggle: () => void;
  onPageChange: (page: AppPage) => void;
};

const pageIcons: Record<
  AppPage,
  LucideIcon
> = {
  overview: LayoutDashboard,
  workforce: Users,
  attrition: TrendingDown,  "talent-acquisition": UserPlus,
  "survey-sentiment": MessageSquareText,
  finance: DollarSign,
  skills: Sparkles,
  "workforce-planning": CalendarDays,
};

export function AppSidebar({
  activePage,
  navCollapsed,
  onToggle,
  onPageChange,
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
      >        {navCollapsed ? (
          <PanelLeftOpen className="h-5 w-5" />
        ) : (
          <>
            <PanelLeftClose className="h-5 w-5" />
            <span className="max-md:hidden">Collapse navigation</span>
          </>
        )}
      </Button>

      <nav className="space-y-4">
        {appNavigationSections.map(
          (section, sectionIndex) => (
            <div
              key={section.key}
              className={
                sectionIndex === 0
                  ? ""
                  : "border-t pt-4"
              }
            >
              {!navCollapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground max-md:hidden">
                  {section.title}
                </p>
              )}

              <div className="space-y-1">
                {section.pages.map((page) => {
                  const metadata =
                    getAppPageMetadata(page);
                  const Icon = pageIcons[page];
                  const active =
                    activePage === page;                  return (
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
                        navCollapsed
                          ? section.title +
                            " — " +
                            metadata.label
                          : metadata.description
                      }
                      onClick={() =>
                        onPageChange(page)
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
                })}
              </div>
            </div>
          )
        )}
      </nav>
    </aside>
  );
}
