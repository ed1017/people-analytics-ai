// @ts-expect-error Native Node tests share TypeScript source.
import {readUserGoalIntent} from './home-user-goal-intent.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {workforceChoiceDiscoveryGoal} from './home-planning-intent.ts';

export type HomeTurnPurpose = 'answer' | 'goal' | 'discovery' | 'plan';
type Turn = {role:string;content:string};
export const homeQuestionText = (message:string) => message.split(/\n\n(?:Focused issue|Session problem context)/)[0].trim();

/** Preparation is opt-in. An old goal or an interrogative alone never requests a new card. */
export function homeTurnPurpose(message:string, history:readonly Turn[]=[]):HomeTurnPurpose {
  const text=homeQuestionText(message);
  if (/^(?:please\s+)?(?:do not|don't|don’t)\b/i.test(text)) return 'answer';
  if (/^(?:(?:please|can you|could you)\s+)*(?:develop|create|draft|write|make|build|prepare|show|give me)\b[^?\n]*\b(?:action plan|full plan|plan drafts|solution bundles|plan)\b/i.test(text)) return 'plan';
  if (/^(?:(?:please|can you|could you)\s+)*(?:help (?:me|us) )?(?:find|identify|suggest|propose|generate|refine|update)\b[^?\n]*\b(?:issue|problem|investigation|candidate|goal|priorit)/i.test(text) || /^where should (?:i|we) focus\b/i.test(text)) return 'discovery';
  if (workforceChoiceDiscoveryGoal(text)) return 'goal';
  // Questions and analytical imperatives stay conversational, even with an earlier goal.
  if (/\?|^(?:why|what|how|when|where|who|which|is|are|was|were|does|do|did|can|could|would|should|explain|compare|summarize|describe|tell me|review|explore)\b/i.test(text)) return 'answer';
  if (readUserGoalIntent([text]).status !== 'no_goal') return 'goal';
  // A brief budget/scope clarification can continue an explicit user-authored goal.
  const statements=history.filter(turn=>turn.role==='user').map(turn=>homeQuestionText(turn.content));
  if (readUserGoalIntent(statements).status !== 'no_goal' && /^(?:budget|within|over|use|scope|by|with|no net|all countries|voluntary|regrettable)\b/i.test(text)) return 'goal';
  // An explicit acceptance of the immediately preceding assumption question is
  // still part of preparing that goal. A bare yes or an unrelated answer is not.
  const previous=history.at(-1);
  if (readUserGoalIntent(statements).status !== 'no_goal' && previous?.role==='assistant'
    && /\b(?:use|keep|accept)\b[^?\n]*\b(?:baseline|budget|scope|horizon|target|rate|capacity)\b[^?\n]*\?/i.test(previous.content)
    && /^yes[,!.]?\s+(?:please\s+)?(?:use|keep|accept)\b/i.test(text)) return 'goal';
  return 'answer';
}

/** Keep the referenced period/topic available to packet selection on short follow-ups. */
export function homeEvidenceSelection(message:string, history:readonly Turn[], goal='') {
  return [goal,...history.filter(turn=>turn.role==='user').slice(-4).map(turn=>homeQuestionText(turn.content).slice(0,1200)),homeQuestionText(message)].filter(Boolean).join('\n\nCURRENT USER TURN:\n');
}

export function homeConversationInstructions(purpose:HomeTurnPurpose) {
  return `HOME CONVERSATION: Answer the current question directly in natural language, using recent user and assistant turns to resolve follow-ups such as "what about March?" or "why?". A pinned goal is optional context, never a prerequisite for answering. Do not turn an ordinary question into a goal, investigation card, goal-choice question, or plan. Earlier assistant text is conversation context, not evidence; ground every current factual claim in the supplied packet. A correction of month, year, scope or metric supersedes earlier wording.
For historical turnover questions, identify the requested month AND year and the selected scope. If the year is ambiguous, ask which year while explaining what can be established. Use A1 monthly rows only for their explicit company-wide months. Separate exit counts, monthly turnover rates, YTD rates and the rate denominator. When requested monthly counts or rates are supplied, use them even if the denominator is unavailable; a missing denominator does not make a supplied rate unavailable. Compare all explicitly requested supplied periods, and do not carry forward an earlier unavailable claim over current source rows. Compare the requested month with the supplied preceding month or same month last year only when periods and populations match; rate differences are percentage points. Do not back-solve an unavailable denominator from rounded rates or substitute snapshot headcount. Never infer April's exits, rate or cause from September/YTD totals. A1 reasons and S2 feedback are not month-specific or selected-scope evidence. A high count is not proof of a high rate. State exactly which month/year, selected-scope monthly counts/rates, denominator, comparison or causal evidence is missing. Still explain what the available evidence supports and a useful next analysis. Counts/rates can describe a change, never establish why people left; distinguish hypotheses from demonstrated causes.
For an explicit turnover goal, preserve overall turnover unless the user explicitly narrows it. Voluntary turnover rates, total turnover rates and regrettable exit counts are different measures; never silently substitute one for another. The primary goal and pin stay above optional findings. Use a concise answer with only relevant optional evidence. A group-specific focus suggestion needs a supplied group rate, comparable rate, matching period/population, and adequate denominator/suppression provenance. No eligible comparable group-rate/denominator breakdown is supplied in the current Home packet: do not invent an engineering, job or level cut, rank sampled rows as highest, treat a share of exits as turnover, combine W1 headcount with A1 exits, or use simulated group forecasts to fill this gap. State that limitation once, briefly. Voluntary-only focus is optional; it does not redefine the broad goal without the user's selection.
When listing several categories with the same measure and population, use one short lead bullet with indented sub-bullets for category values. Keep A1 administrative separation counts, S2 exit-survey respondent reasons and S1 favorability separate. An S2 as-of date is not a supplied fieldwork period.
For Action Plan costs and budget comparisons, use cash expenses only and report employee effort in hours. Do not price staff hours, multiply them by hourly rates, or include employee-time valuations from earlier conversation or Development estimates in plan totals. Keep actual cash items such as training fees, vendor fees and materials, and keep unentered cash costs unknown.
Use the applicable concise response format; do not force a goal-oriented next step or pad a list with extra metrics. An optional follow-up should deepen the user's question. Goals and plans are created only when explicitly requested.
CURRENT TURN PURPOSE: ${purpose}. ${purpose==='answer'||purpose==='plan'?'Return the complete response in answer, next_step:none, problem:null, problem_evidence:[], options:[], question:null. Put any essential conversational clarification in answer.':'Keep the answer complete and visible; goal/investigation fields supplement it for explicit review. Never claim a goal was pinned or a plan executed.'}`;
}
