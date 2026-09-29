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
import type { AppPage } from "@/lib/types";

type AppSidebarProps = {
  activePage: AppPage;
  navCollapsed: boolean;
  onToggle: () => void;
  onPageChange: (page: AppPage) => void;
};

export function AppSidebar({
  activePage,
  navCollapsed,
  onToggle,
  onPageChange,
}: AppSidebarProps) {
  return (
    <aside className="border-r p-3">
      <Button
        variant="ghost"
        className={`mb-4 w-full ${
          navCollapsed
            ? "justify-center px-0"
            : "justify-start"
        }`}
        onClick={onToggle}
        title={
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
            <span>Collapse</span>
          </>
        )}
      </Button>

      <nav className="space-y-2">
        <Button
          variant={
            activePage === "overview"
              ? "default"
              : "ghost"
          }
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Overview"
          onClick={() => onPageChange("overview")}
        >
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          {!navCollapsed && <span>Overview</span>}
        </Button>

        <Button
          variant="ghost"
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Workforce"
        >
          <Users className="h-5 w-5 shrink-0" />
          {!navCollapsed && <span>Workforce</span>}
        </Button>

        <Button
          variant="ghost"
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Attrition"
        >
          <TrendingDown className="h-5 w-5 shrink-0" />
          {!navCollapsed && <span>Attrition</span>}
        </Button>

        <Button
          variant={
            activePage === "talent-acquisition"
              ? "default"
              : "ghost"
          }
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Talent Acquisition"
          onClick={() =>
            onPageChange("talent-acquisition")
          }
        >
          <UserPlus className="h-5 w-5 shrink-0" />
          {!navCollapsed && (
            <span>Talent Acquisition</span>
          )}
        </Button>

        <Button
          variant={
            activePage === "survey-sentiment"
              ? "default"
              : "ghost"
          }
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Survey & Sentiment"
          onClick={() =>
            onPageChange("survey-sentiment")
          }
        >
          <MessageSquareText className="h-5 w-5 shrink-0" />
          {!navCollapsed && (
            <span>Survey & Sentiment</span>
          )}
        </Button>

        <Button
          variant={
            activePage === "finance"
              ? "default"
              : "ghost"
          }
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Labor Cost"
          onClick={() => onPageChange("finance")}
        >
          <DollarSign className="h-5 w-5 shrink-0" />
          {!navCollapsed && <span>Labor Cost</span>}
        </Button>

        <Button
          variant={
            activePage === "skills"
              ? "default"
              : "ghost"
          }
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Skills"
          onClick={() => onPageChange("skills")}
        >
          <Sparkles className="h-5 w-5 shrink-0" />
          {!navCollapsed && <span>Skills</span>}
        </Button>

        <Button
          variant={
            activePage === "workforce-planning"
              ? "default"
              : "ghost"
          }
          className={`w-full gap-3 ${
            navCollapsed
              ? "justify-center px-0"
              : "justify-start"
          }`}
          title="Workforce Planning"
          onClick={() =>
            onPageChange("workforce-planning")
          }
        >
          <CalendarDays className="h-5 w-5 shrink-0" />
          {!navCollapsed && (
            <span>Workforce Planning</span>
          )}
        </Button>
      </nav>
    </aside>
  );
}
