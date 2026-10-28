"use client";

import {AssumptionsDisclosure} from "./assumptions-disclosure";
import type { ReactNode } from "react";
import type { AppPage } from "@/lib/types";
import { getChatNavigationAction } from "@/lib/chat-navigation";
import {chatCaveatLineNumbers} from '@/lib/chat-caveat-blocks';
import {homeAnswerPresentation} from '@/lib/home-answer-presentation';
import {catalogProseDisplay} from '@/lib/catalog-display';

// Evidence IDs identify their own pages, including S2 exit feedback in Attrition.
const sourceTargets:Readonly<Record<string,string>>={W1:'workforce',W2:'workforce',A1:'attrition',R1:'talent-acquisition',S1:'survey-sentiment',S2:'attrition',T1:'skills',T2:'learning-development',T4:'career-growth-mobility',T5:'succession-planning',P1:'planning-overview',P2:'position-workforce-design',F1:'finance',I1:'occupational-references',I2:'labor-market',I3:'training-coaching',D1:'development-planning',M1:'labor-market'};
const evidenceId='(?:W[12]|A1|R1|S[12]|T[1-5]|P[12]|F1|I[1-3]|D1|M1)';
const evidenceToken=evidenceId+'(?:[.:][A-Za-z0-9_.:-]+)?';
const citationList=new RegExp('^'+evidenceToken+'(?:\\s*[,;]\\s*'+evidenceToken+')*$','i');

function renderInlineMarkdown(
  value: string,
  onNavigate?: (page: AppPage) => void,
  citationTargets: ReadonlyMap<string,string> = new Map(),
) {
  const parts = value.split(new RegExp('(\\(?\\[[A-Z]+\\d+\\](?:[, ]+\\[[A-Z]+\\d+\\])*\\s+See\\s+\\[[^\\]\\n]+\\]\\(app:[a-z-]+\\)\\.?\\)?|\\[[^\\]\\n]+\\]\\(app:[a-z-]+\\)|\\*\\*\\*.*?\\*\\*\\*|\\*\\*.*?\\*\\*|\\*.*?\\*|\\['+evidenceToken+'(?:\\s*[,;]\\s*'+evidenceToken+')*\\])','gi'));

  return parts.map((part, index) => {
    // Only source-navigation references become secondary text; answer prose stays intact.
    const reference = part.match(/^\(?((?:\[[A-Z]+\d+\](?:[, ]+\[[A-Z]+\d+\])*)\s+See\s+)(\[[^\]\n]+\]\((app:[a-z-]+)\))(\.?)\)?$/i);
    const referenceAction = reference ? getChatNavigationAction(reference[3]) : null;
    if (reference) {
      return <span key={index} data-chat-source-reference className="text-[11px] font-normal leading-relaxed text-muted-foreground">({renderInlineMarkdown(reference[1],onNavigate,citationTargets)}{referenceAction&&onNavigate?<button type="button" onClick={() => onNavigate(referenceAction.page)} className="inline-flex min-h-6 items-center rounded-sm text-left font-medium text-primary underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring">{referenceAction.label}</button>:renderInlineMarkdown(reference[2],onNavigate,citationTargets)}{reference[4]})</span>;
    }
    // Only known evidence IDs are citations. Bracketed dates, units and data stay full size.
    const citation = part.match(/^\[([^\]]+)\](?:\((app:[a-z-]+)\))?$/i);
    if (citation&&citationList.test(citation[1])) {
      return <span key={index}>{citation[1].split(/\s*[,;]\s*/).map((token,n)=>{
        const [id,field]=token.toUpperCase().split(/[.:](.*)/),target=id==='T3'?null:sourceTargets[id]?'app:'+sourceTargets[id]:citation[2]??citationTargets.get(id),action=target?getChatNavigationAction(target):null;
        return <sup key={n} data-chat-citation={id} className="align-super text-[11px] font-normal leading-none text-foreground">
          {action&&onNavigate?<button type="button" aria-label={`Source ${id}: ${action.label}`} title={`Source ${id}: ${action.label}${field?' · '+token.slice(id.length+1):''}`} onClick={()=>onNavigate(action.page)} className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-sm px-0.5 text-primary underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring">[{id}]</button>:<span aria-label={`Source ${id}`} title={id==='T3'?'Career interests: see Home Data details':`Source ${id}`}>[{id}]</span>}
        </sup>;
      })}</span>;
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
          {renderInlineMarkdown(part.slice(3, -3), onNavigate, citationTargets)}
        </strong>
      );
    }

    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {renderInlineMarkdown(part.slice(2, -2), onNavigate, citationTargets)}
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
          {renderInlineMarkdown(part.slice(1, -1), onNavigate, citationTargets)}
        </em>
      );
    }

    return (
      <span key={index}>
        {catalogProseDisplay(part)}
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
  compact = false,
  collapseCaveats = true,
  bulletAction,
}: {
  content: string;
  bulletAction?: (text:string)=>ReactNode;
  compact?: boolean;
  collapseCaveats?: boolean;
  onNavigate?: (page: AppPage) => void;
}) {
  const references: string[] = [];
  const citationTargets = new Map<string,string>();
  // Compact answers may explicitly label supporting Details; all other prose
  // stays visible. User messages and nested disclosures do not use this split.
  const presentation=collapseCaveats?homeAnswerPresentation(content,{supportingDetails:compact}):{answer:content,details:[]};
  const qualifierLines=new Set(chatCaveatLineNumbers(presentation.answer.trim()));
  const answer = presentation.answer.replace(/\(?\[[A-Z]+\d+\](?:[, ]+\[[A-Z]+\d+\])*\s+See\s+\[[^\]\n]+\]\(app:[a-z-]+\)\.?\)?/gi, reference => {
    const href = reference.match(/\]\((app:[a-z-]+)\)/)?.[1];
    if (!onNavigate || !href || !getChatNavigationAction(href)) return reference;
    references.push(reference);
    for(const match of reference.matchAll(/\[([A-Z]+\d+)\]/gi)) citationTargets.set(match[1].toUpperCase(),href);
    // Keep evidence IDs beside their claim; only navigation detail moves below.
    return reference.match(/^\(?(\[[A-Z]+\d+\](?:[, ]+\[[A-Z]+\d+\])*)/i)?.[1] ?? reference;
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
          role="region"
          aria-label="Response table"
          tabIndex={0}
          className="my-2 w-fit max-w-full overflow-x-auto rounded-lg border focus-visible:outline-2 focus-visible:outline-ring"
        >
          <table className="compact-data-table text-sm leading-normal">
            <thead className="bg-muted/40">
              <tr>
                {headers.map(
                  (header, headerIndex) => (
                    <th
                      key={headerIndex}
                      scope="col"
                      className="border-b text-left font-semibold"
                    >
                      {renderInlineMarkdown(
                        header, onNavigate, citationTargets
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
                          className="align-top"
                        >
                          {renderInlineMarkdown(
                            row[
                              cellIndex
                            ] ?? "", onNavigate, citationTargets
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
      if (compact) { index += 1; continue; }
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
          data-chat-heading={compact || undefined}
          data-chat-caveat-qualifier={qualifierLines.has(index)||undefined}
          role={compact ? "heading" : undefined}
          aria-level={compact ? 3 : undefined}
          className={qualifierLines.has(index)?"text-sm font-semibold":"font-semibold"}
        >
          {renderInlineMarkdown(
            headingMatch[2], onNavigate, citationTargets
          )}
        </p>
      );

      index += 1;
      continue;
    }

    const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
    if (listMatch) {
      const renderList=(indent:number,ordered:boolean):ReactNode=>{
        const items:ReactNode[]=[],start=index,first=Number(listMatch[2].replace('.',''));
        while(index<lines.length){
          const item=lines[index].match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
          if(!item||item[1].length!==indent||/\d/.test(item[2])!==ordered)break;
          const key=index,text=item[3],children:ReactNode[]=[];index++;
          while(index<lines.length){
            const nested=lines[index].match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
            if(!nested||nested[1].length<=indent)break;
            children.push(renderList(nested[1].length,/\d/.test(nested[2])));
          }
          items.push(<li key={key} value={ordered?Number(item[2].replace('.','')):undefined} data-chat-item={compact||undefined} data-chat-caveat-qualifier={qualifierLines.has(key)||undefined} className={qualifierLines.has(key)?"text-sm leading-relaxed":undefined}>
            <span>{renderInlineMarkdown(text,onNavigate,citationTargets)}{!ordered&&bulletAction?.(text)}</span>{children}
          </li>);
        }
        const classes="space-y-1.5 pl-5";
        return ordered?<ol key={`list-${start}`} start={Number.isFinite(first)?first:undefined} className={`list-decimal ${classes}`}>{items}</ol>:<ul key={`list-${start}`} className={`list-disc ${classes}`}>{items}</ul>;
      };
      rendered.push(renderList(listMatch[1].length,/\d/.test(listMatch[2])));
      continue;
    }

    rendered.push(
      <p key={`text-${index}`} data-chat-caveat-qualifier={qualifierLines.has(index)||undefined} className={qualifierLines.has(index)?"text-sm leading-relaxed":undefined}>
        {renderInlineMarkdown(
          trimmed, onNavigate, citationTargets
        )}
      </p>
    );

    index += 1;
  }

  return (
    <div className={compact ? "home-answer text-base leading-relaxed" : "space-y-3 text-base leading-relaxed"}>
      {rendered}
      {presentation.details.length>0&&<AssumptionsDisclosure evidenceDetails className="mt-2">{presentation.details.map((detail,index)=><ChatContent key={index} content={detail} onNavigate={onNavigate} compact collapseCaveats={false}/>)}</AssumptionsDisclosure>}
      {references.length > 0 && <aside aria-label="Answer sources" className="mt-2 space-y-0.5 border-t border-border/40 pt-1">
        {references.map((reference, referenceIndex) => <div key={referenceIndex} className="text-[11px] leading-relaxed">{renderInlineMarkdown(reference, onNavigate, citationTargets)}</div>)}
      </aside>}
    </div>
  );
}
