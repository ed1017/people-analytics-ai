"use client";

import type { ReactNode } from "react";
import type { AppPage } from "@/lib/types";
import { getChatNavigationAction } from "@/lib/chat-navigation";

function renderInlineMarkdown(
  value: string,
  onNavigate?: (page: AppPage) => void,
) {
  const parts = value.split(
    /(\(?\[[A-Z]+\d+\](?:[, ]+\[[A-Z]+\d+\])*\s+See\s+\[[^\]\n]+\]\(app:[a-z-]+\)\.?\)?|\[[^\]\n]+\]\(app:[a-z-]+\)|\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g
  );

  return parts.map((part, index) => {
    // Only source-navigation references become secondary text; answer prose stays intact.
    const reference = part.match(/^\(?((?:\[[A-Z]+\d+\](?:[, ]+\[[A-Z]+\d+\])*)\s+See\s+)(\[[^\]\n]+\]\((app:[a-z-]+)\))(\.?)\)?$/);
    const referenceAction = reference ? getChatNavigationAction(reference[3]) : null;
    if (reference && referenceAction && onNavigate) {
      return <span key={index} data-chat-source-reference className="text-[11px] font-normal leading-relaxed text-muted-foreground">({reference[1]}<button type="button" onClick={() => onNavigate(referenceAction.page)} className="inline-flex min-h-6 items-center rounded-sm text-left font-medium text-primary underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring">{referenceAction.label}</button>{reference[4]})</span>;
    }
    const link = part.match(/^\[[^\]\n]+\]\((app:[a-z-]+)\)$/);
    const action = link ? getChatNavigationAction(link[1]) : null;
    if (action && onNavigate) {
      return <button key={index} type="button" onClick={() => onNavigate(action.page)} className="rounded-sm text-left font-semibold text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring">{action.label}</button>;
    }
    if (
      part.startsWith("***") &&
      part.endsWith("***")
    ) {
      return (
        <strong
          key={index}
          className="italic"
        >
          {renderInlineMarkdown(part.slice(3, -3), onNavigate)}
        </strong>
      );
    }

    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {renderInlineMarkdown(part.slice(2, -2), onNavigate)}
        </strong>
      );
    }

    if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length > 2
    ) {
      return (
        <em key={index}>
          {renderInlineMarkdown(part.slice(1, -1), onNavigate)}
        </em>
      );
    }

    return (
      <span key={index}>
        {part}
      </span>
    );
  });
}

function parseMarkdownTableRow(
  line: string
) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMarkdownTableSeparator(
  line: string
) {
  const cells =
    parseMarkdownTableRow(line);

  return (
    cells.length >= 2 &&
    cells.every((cell) =>
      /^:?-{3,}:?$/.test(cell)
    )
  );
}

export function ChatContent({
  content,
  onNavigate,
}: {
  content: string;
  onNavigate?: (page: AppPage) => void;
}) {
  const references: string[] = [];
  const answer = content.replace(/\(?\[[A-Z]+\d+\](?:[, ]+\[[A-Z]+\d+\])*\s+See\s+\[[^\]\n]+\]\(app:[a-z-]+\)\.?\)?/g, reference => {
    const href = reference.match(/\]\((app:[a-z-]+)\)/)?.[1];
    if (!onNavigate || !href || !getChatNavigationAction(href)) return reference;
    references.push(reference);
    return "";
  });
  const lines = answer.trim().split("\n");
  const rendered: ReactNode[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    const nextLine =
      lines[index + 1]?.trim() ?? "";

    const looksLikeTable =
      trimmed.includes("|") &&
      nextLine.includes("|") &&
      isMarkdownTableSeparator(
        nextLine
      );

    if (looksLikeTable) {
      const headers =
        parseMarkdownTableRow(trimmed);

      const rows: string[][] = [];
      index += 2;

      while (
        index < lines.length &&
        lines[index].trim().includes("|") &&
        lines[index].trim() !== ""
      ) {
        rows.push(
          parseMarkdownTableRow(
            lines[index]
          )
        );
        index += 1;
      }

      rendered.push(
        <div
          key={`table-${index}`}
          className="my-3 overflow-x-auto rounded-lg border"
        >
          <table className="w-full min-w-[560px] text-[15px]">
            <thead className="bg-muted/40">
              <tr>
                {headers.map(
                  (header, headerIndex) => (
                    <th
                      key={headerIndex}
                      className="border-b px-3 py-2 text-left font-semibold"
                    >
                      {renderInlineMarkdown(
                        header, onNavigate
                      )}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map(
                (row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b last:border-0"
                  >
                    {headers.map(
                      (
                        _header,
                        cellIndex
                      ) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 align-top"
                        >
                          {renderInlineMarkdown(
                            row[
                              cellIndex
                            ] ?? "", onNavigate
                          )}
                        </td>
                      )
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      );

      continue;
    }

    if (!trimmed) {
      rendered.push(
        <div
          key={`space-${index}`}
          className="h-1"
        />
      );
      index += 1;
      continue;
    }

    const headingMatch =
      trimmed.match(
        /^(#{1,3})\s+(.+)$/
      );

    if (headingMatch) {
      rendered.push(
        <p
          key={`heading-${index}`}
          className="font-semibold"
        >
          {renderInlineMarkdown(
            headingMatch[2], onNavigate
          )}
        </p>
      );

      index += 1;
      continue;
    }

    const bulletMatch =
      trimmed.match(
        /^[-*]\s+(.+)$/
      );

    if (bulletMatch) {
      rendered.push(
        <div
          key={`bullet-${index}`}
          className="flex gap-2"
        >
          <span className="text-muted-foreground">
            •
          </span>
          <span>
            {renderInlineMarkdown(
              bulletMatch[1], onNavigate
            )}
          </span>
        </div>
      );

      index += 1;
      continue;
    }

    const numberedMatch =
      trimmed.match(
        /^(\d+)\.\s+(.+)$/
      );

    if (numberedMatch) {
      rendered.push(
        <div
          key={`number-${index}`}
          className="flex gap-2"
        >
          <span className="min-w-5 text-muted-foreground">
            {numberedMatch[1]}.
          </span>
          <span>
            {renderInlineMarkdown(
              numberedMatch[2], onNavigate
            )}
          </span>
        </div>
      );

      index += 1;
      continue;
    }

    rendered.push(
      <p key={`text-${index}`}>
        {renderInlineMarkdown(
          trimmed, onNavigate
        )}
      </p>
    );

    index += 1;
  }

  return (
    <div className="space-y-2 leading-relaxed">
      {rendered}
      {references.length > 0 && <aside aria-label="Answer sources" className="mt-2 space-y-0.5 border-t border-border/40 pt-1">
        {references.map((reference, referenceIndex) => <div key={referenceIndex} className="text-[11px] leading-relaxed">{renderInlineMarkdown(reference, onNavigate)}</div>)}
      </aside>}
    </div>
  );
}
