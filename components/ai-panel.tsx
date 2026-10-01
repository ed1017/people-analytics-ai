"use client";

import {
  useEffect,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
} from "react";
import {
  LoaderCircle,
  Maximize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Send,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ChatContent } from "@/components/chat-content";
import type { ChatMessage } from "@/lib/types";

type AiPanelProps = {
  aiCollapsed: boolean;
  aiExpanded: boolean;
  aiSide: "left" | "right";
  aiWidth: number;
  previewPage: boolean;
  suggestedPrompts: string[];
  chatMessages: ChatMessage[];
  chatInput: string;
  chatLoading: boolean;
  chatError: string | null;
  dashboardReady: boolean;
  onResizeStart: MouseEventHandler<HTMLDivElement>;
  onResizeKeyDown: KeyboardEventHandler<HTMLDivElement>;
  onToggleExpanded: () => void;
  onToggleCollapsed: () => void;
  onAiSideChange: (
    side: "left" | "right"
  ) => void;
  onSuggestedPrompt: (
    prompt: string
  ) => void | Promise<void>;
  onChatInputChange: (value: string) => void;
  onSend: () => void | Promise<void>;
};

export function AiPanel({
  aiCollapsed,
  aiExpanded,
  aiSide,
  aiWidth,
  previewPage,
  suggestedPrompts,
  chatMessages,
  chatInput,
  chatLoading,
  chatError,
  dashboardReady,
  onResizeStart,
  onResizeKeyDown,
  onToggleExpanded,
  onToggleCollapsed,
  onAiSideChange,
  onSuggestedPrompt,
  onChatInputChange,
  onSend,
}: AiPanelProps) {
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
          aria-description="Use the left and right arrow keys to resize the AI panel. Home sets the minimum width and End sets the maximum width."
          tabIndex={0}
          onMouseDown={onResizeStart}
          onKeyDown={onResizeKeyDown}
          title={`Resize AI panel — currently ${Math.round(
            aiWidth
          )} pixels wide`}
          className="app-ai-resizer group relative cursor-col-resize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset max-md:hidden"
        >
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-primary" />
          <div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted-foreground/30 transition-colors group-hover:bg-primary" />
        </div>
      )}

      <aside
        className={
          aiCollapsed
            ? "app-ai-panel sticky top-16 flex h-[calc(100vh-4rem)] min-w-0 flex-col overflow-hidden border-l bg-card p-4 max-md:h-16"
            : "app-ai-panel sticky top-16 flex h-[calc(100vh-4rem)] min-w-0 flex-col overflow-hidden border-l bg-card p-4 max-md:h-[70vh] max-md:min-h-[520px]"
        }
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          {!aiCollapsed && (
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h2 className="text-xl font-semibold">
                Ask People Analytics AI
              </h2>
            </div>
          )}

          <div className="ml-auto flex gap-1">
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
              {aiSide === "left" ? (
                aiCollapsed ? (
                  <PanelLeftOpen className="h-5 w-5" />
                ) : (
                  <PanelLeftClose className="h-5 w-5" />
                )
              ) : aiCollapsed ? (
                <PanelRightOpen className="h-5 w-5" />
              ) : (
                <PanelRightClose className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {aiCollapsed ? (
          <div className="flex justify-center pt-4">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 hidden grid-cols-2 gap-1 rounded-lg border p-1 text-sm md:grid">
              <button
                type="button"
                aria-pressed={aiSide === "left"}
                onClick={() =>
                  onAiSideChange("left")
                }
                className={
                  aiSide === "left"
                    ? "rounded-md bg-muted px-3 py-2 font-medium"
                    : "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                }
              >
                AI on left
              </button>
              <button
                type="button"
                aria-pressed={aiSide === "right"}
                onClick={() =>
                  onAiSideChange("right")
                }
                className={
                  aiSide === "right"
                    ? "rounded-md bg-muted px-3 py-2 font-medium"
                    : "rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                }
              >
                AI on right
              </button>
            </div>

            <p className="mb-3 text-base text-muted-foreground">
              Ask questions about the workforce data currently shown.
            </p>

            {previewPage && (
              <div className="mb-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                AI grounding for this module is coming soon.
              </div>
            )}

            {chatMessages.length === 0 && (
              <div className="mb-3 grid gap-2">
                {suggestedPrompts.map(
                  (prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() =>
                        void onSuggestedPrompt(
                          prompt
                        )
                      }
                      disabled={
                        chatLoading ||
                        !dashboardReady
                      }
                      className="rounded-lg border p-3 text-left text-[15px] leading-snug transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  )
                )}
              </div>
            )}

            <div className="mb-3 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain rounded-lg border p-3 pr-2">
              {chatMessages.length === 0 ? (
                <div className="flex h-full min-h-28 items-center justify-center text-center text-base text-muted-foreground">
                  AI conversation will appear here.
                </div>
              ) : (
                chatMessages.map(
                  (message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role === "user"
                          ? "ml-3 rounded-lg bg-muted p-4 text-[17px] leading-relaxed md:ml-5"
                          : "mr-3 rounded-lg border p-4 text-[17px] leading-relaxed md:mr-5"
                      }
                    >
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        {message.role === "user"
                          ? "You"
                          : "People Analytics AI"}
                      </p>

                      {message.role ===
                      "assistant" ? (
                        <ChatContent
                          content={
                            message.content
                          }
                        />
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                      )}
                    </div>
                  )
                )
              )}

              {chatLoading && (
                <div className="mr-3 flex items-center gap-2 rounded-lg border p-3 text-[17px] text-muted-foreground md:mr-5">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Analyzing current workforce context…
                </div>
              )}
            </div>

            {chatError && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                {chatError}
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
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
                    ? "AI grounding for this module is coming soon…"
                    : "Ask about the current workforce…"
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

            <p className="mt-2 text-xs text-muted-foreground">
              Answers are grounded in the dashboard context currently loaded.
            </p>
          </div>
        )}
      </aside>
    </>
  );
}
