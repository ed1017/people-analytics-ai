"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from "react";
import {
  Info,
  LoaderCircle,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  Send,
  Sparkles,
} from "lucide-react";

import { PromptExamples } from "@/components/prompt-examples";
import { Button } from "@/components/ui/button";
import { GoalConversationMessages, ConversationMessages } from "@/components/goal-conversation-messages";
import type { ChatMessage } from "@/lib/types";

type AiPanelProps = {
  goalTakeaway?:ReactNode;
  goalViewKey?:string;
  hasGoal?:boolean;
  readOnlyReason?: string;
  aiCollapsed: boolean;
  aiExpanded: boolean;
  aiWidth: number;
  previewPage: boolean;
  suggestedPrompts: string[];
  scopeNote: string;
  chatMessages: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  chatError: string | null;
  dashboardReady: boolean;
  onResizeStart: MouseEventHandler<HTMLDivElement>;
  onResizeKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onToggleExpanded: () => void;
  onToggleCollapsed: () => void;
  onChatInputChange: (value: string) => void;
  onDraftExample: (prompt: string) => void;
  onSend: () => void | Promise<void>;
};

export function AiPanel({
  goalTakeaway,goalViewKey="",hasGoal=false,
  readOnlyReason,
  aiCollapsed,
  aiExpanded,
  aiWidth,
  previewPage,
  suggestedPrompts,
  scopeNote,
  chatMessages,
  chatInput,
  chatLoading,
  chatError,
  dashboardReady,
  onResizeStart,
  onResizeKeyDown,
  onToggleExpanded,
  onToggleCollapsed,
  onChatInputChange,
  onDraftExample,
  onSend,
}: AiPanelProps) {
  const composer = useRef<HTMLTextAreaElement>(null);
  const [viewportWidth, setViewportWidth] =
    useState(1440);

  useEffect(() => {
    const syncViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    syncViewportWidth();
    window.addEventListener(
      "resize",
      syncViewportWidth
    );

    return () => {
      window.removeEventListener(
        "resize",
        syncViewportWidth
      );
    };
  }, []);

  const resizeHelpId = useId();
  const detailsId = useId();
  const minimumAiWidth = 280;
  const maximumAiWidth = Math.max(
    minimumAiWidth,
    viewportWidth * 0.5
  );
  const aiResizePercent =
    maximumAiWidth === minimumAiWidth
      ? 0
      : Math.round(
          ((Math.min(
            maximumAiWidth,
            Math.max(
              minimumAiWidth,
              aiWidth
            )
          ) -
            minimumAiWidth) /
            (maximumAiWidth -
              minimumAiWidth)) *
            100
        );

  return (
    <>
      {!aiCollapsed && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize AI panel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={aiResizePercent}
          aria-valuetext={`${Math.round(
            aiWidth
          )} pixels wide`}
          aria-describedby={resizeHelpId}
          tabIndex={0}
          onMouseDown={onResizeStart}
          onKeyDown={onResizeKeyDown}
          title={`Resize AI panel — currently ${Math.round(
            aiWidth
          )} pixels wide`}
          className="app-ai-resizer group relative cursor-col-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset max-md:hidden"
        >
          <span id={resizeHelpId} className="sr-only">Use the left and right arrow keys to resize the AI panel. Home sets the minimum width and End sets the maximum width.</span>
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary" />
          <div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary" />
        </div>
      )}

      <aside
        className={
          aiCollapsed
            ? "app-ai-panel sticky top-[var(--app-header-height)] flex h-[calc(100vh-var(--app-header-height))] min-w-0 flex-col overflow-hidden border-l bg-card p-4 max-md:h-16"
            : "app-ai-panel sticky top-[var(--app-header-height)] flex h-[calc(100vh-var(--app-header-height))] min-w-0 flex-col overflow-hidden border-l bg-card p-4 max-md:h-[70vh] max-md:min-h-[520px]"
        }
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          {!aiCollapsed && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div><h2 className="text-xl font-semibold">
                Ask AI
              </h2></div>
            </div>
          )}

          <div className="ml-auto flex gap-1">
            {!aiCollapsed&&<button type="button" popoverTarget={detailsId} aria-label="Open conversation details" className="flex h-9 w-9 items-center justify-center rounded hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"><Info size={18}/></button>}
            {!aiCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleExpanded}
                title={
                  aiExpanded
                    ? "Return to normal size"
                    : "Expand AI panel"
                }
              >
                <Maximize2 className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleCollapsed}
              title={
                aiCollapsed
                  ? "Open AI panel"
                  : "Collapse AI panel"
              }
            >
              {aiCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div id={detailsId} popover="auto" role="dialog" aria-label="Conversation details" className="fixed inset-0 m-auto max-h-[80dvh] w-[min(42rem,92vw)] overflow-y-auto rounded-xl border bg-background p-5 text-foreground shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Conversation details</h2><button type="button" popoverTarget={detailsId} popoverTargetAction="hide" className="min-h-11 rounded border px-3 focus-visible:ring-2 focus-visible:ring-ring">Close conversation details</button></div>
          <section aria-label="Current evidence scope"><h3 className="font-semibold">Evidence scope</h3><p className="mt-1 text-sm">{scopeNote}</p>{readOnlyReason&&<p className="mt-2 text-sm">{readOnlyReason}</p>}</section>
          <section aria-label="Conversation history" className="mt-5"><h3 className="font-semibold">Conversation history</h3><p className="my-2 text-xs text-muted-foreground">Reference only. Current findings use current evidence and saved goal context.</p>{chatMessages.length?<ConversationMessages messages={chatMessages}/>:<p className="text-sm">No conversation yet.</p>}</section>
        </div>

        {aiCollapsed ? (
          <div className="flex justify-center pt-4">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {previewPage && !readOnlyReason && (
              <div className="mb-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                This page does not yet support AI analysis.
              </div>
            )}

            <div className="shrink-0">{goalTakeaway}</div>
            {!dashboardReady&&!hasGoal&&<p role="status" className="mb-2 text-sm text-muted-foreground">{readOnlyReason?"AI analysis is not available on this page.":"Page evidence is loading or unavailable."}</p>}
            <div key={goalViewKey} aria-label="AI conversation" className="mb-3 min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain pr-2">
              <GoalConversationMessages messages={chatMessages} viewKey={goalViewKey} hasGoal={hasGoal} hideHistory/>
              {!chatMessages.length&&!hasGoal&&!readOnlyReason&&<p className="text-base text-muted-foreground">{readOnlyReason?"Your session conversation stays available here.":dashboardReady?"Ask a question about this page.":"You can keep drafting while page evidence loads."}</p>}

              {chatLoading && (
                <div className="flex items-center gap-2 py-2 text-[17px] text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Analyzing current workforce context…
                </div>
              )}
            </div>

            <div className="mb-3"><PromptExamples prompts={suggestedPrompts} draft={chatInput} busy={chatLoading} onDraft={prompt=>{onDraftExample(prompt);composer.current?.focus();composer.current?.scrollIntoView({block:"nearest"});}}/></div>

            {chatError && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {chatError}
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                ref={composer}
                value={chatInput}
                onChange={(event) =>
                  onChatInputChange(
                    event.target.value
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void onSend();
                  }
                }}
                placeholder={
                  previewPage
                    ? "Open a supported page to continue chatting."
                    : "Ask about this page and your goal."
                }
                disabled={previewPage}
                rows={5}
                aria-label="Ask People Analytics AI"
                className="h-36 min-h-32 max-h-64 min-w-0 flex-1 resize-y rounded-lg border bg-background p-3.5 text-[17px] leading-relaxed outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              />

              <Button
                size="icon"
                className="h-12 w-12 shrink-0 self-end"
                onClick={() => void onSend()}
                disabled={
                  previewPage ||
                  chatLoading ||
                  !chatInput.trim() ||
                  !dashboardReady
                }
                title="Send"
                aria-label="Send message"
              >
                {chatLoading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>


          </div>
        )}
      </aside>
    </>
  );
}
