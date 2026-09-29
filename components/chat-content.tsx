"use client";

import type { ReactNode } from "react";

function renderInlineMarkdown(
  value: string
) {
  const parts = value.split(
    /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("***") &&
      part.endsWith("***")
    ) {
      return (
        <strong
          key={index}
          className="italic"
        >
          {part.slice(3, -3)}
        </strong>
      );
    }

    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
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
          {part.slice(1, -1)}
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
}: {
  content: string;
}) {
  const lines = content.split("\n");
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
          <table className="w-full min-w-[560px] text-xs">
            <thead className="bg-muted/40">
              <tr>
                {headers.map(
                  (header, headerIndex) => (
                    <th
                      key={headerIndex}
                      className="border-b px-3 py-2 text-left font-semibold"
                    >
                      {renderInlineMarkdown(
                        header
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
                            ] ?? ""
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
            headingMatch[2]
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
              bulletMatch[1]
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
              numberedMatch[2]
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
          trimmed
        )}
      </p>
    );

    index += 1;
  }

  return (
    <div className="space-y-2 leading-relaxed">
      {rendered}
    </div>
  );
}
