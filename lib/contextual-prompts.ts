// Local example selection only. No model calls, data loading or persisted state.
export type PromptContext = {
  page: string;
  goal: string;
  hasConversation: boolean;
  evidenceReady: boolean;
  sources?: ReadonlyArray<{id:string;status:string;facts:unknown}>;
};
const topics = [
  {ids:['A1'], match:/\b(retention|attrition|turnover|exit)\b/i, question:'What do recorded separation patterns show, and what remains unexplained?'},
  {ids:['T1','T2'], match:/\b(skill|skills|capability|learning|training|AI)\b/i, question:'Which recorded skill requirements and learning pathways relate to my goal?'},
  {ids:['R1'], match:/\b(hire|hiring|recruiting|recruitment)\b/i, question:'What does historical recruiting evidence show, without promising future starts?'},
  {ids:['F1'], match:/\b(cost|costs|budget|spend)\b/i, question:'Which recorded labor costs relate to my goal, and which cost assumptions are unknown?'},
  {ids:['S1'], match:/\b(engagement|survey|feedback|sentiment)\b/i, question:'What do aggregate survey responses suggest, and what are their coverage limits?'},
  {ids:['T5'], match:/\b(succession)\b/i, question:'What does recorded succession coverage show, within the suppression limits?'},
  {ids:['T4'], match:/\b(mobility|movement|promotion)\b/i, question:'What recorded movement patterns relate to my goal, given incomplete history?'},
];
const pageExamples:Record<string,string> = {
  workforce:'How is the workforce distributed, and which figures follow the selected filters?',
  attrition:topics[0].question,
  skills:topics[1].question,
  'learning-development':'Which required skills have recorded learning pathways, and where is coverage unknown?',
  'career-mobility':'What does recorded career interest show, without treating interest as available capacity?',
  'career-growth-mobility':topics[6].question,
  'succession-planning':topics[5].question,
  'talent-acquisition':topics[2].question,
  'survey-sentiment':topics[4].question,
  finance:topics[3].question,
  'occupational-references':'What do the stored occupation mappings cover, and what should I verify?',
  'labor-market':'What are the dates and scope of these labor-market observations?',
  'training-coaching':'How do the simulated training quotes compare, and which costs remain unknown?',
  'development-planning':'Which costs come from selected quotes and which are my assumptions?',
};
const planningPages = new Set(['planning-overview','scenario-modeling','position-workforce-design','workforce-response','execution-feasibility','workforce-planning']);
const readOnlyPages = new Set(['compensation','decision-brief','assess-evaluate']);
export const homeGoalStarters = [
  'Reduce employee turnover',
  'Build AI skills without adding headcount',
  'Compare hiring, training, and internal moves',
  'Plan within a fixed workforce budget',
  'Which skills do we need, and where are the gaps?',
] as const;
export function hasKnownNumericEvidence(value:unknown):boolean {
  if(typeof value==='number')return Number.isFinite(value);
  if(!value||typeof value!=='object')return false;
  return Object.values(value).some(hasKnownNumericEvidence);
}
export function contextualPrompts(context:PromptContext):string[] {
  const {page,goal,hasConversation,evidenceReady,sources=[]}=context;
  if(readOnlyPages.has(page))return [];
  const focused=Boolean(goal.trim());
  const missing=focused?'What evidence is missing for my goal, and what should I verify first?':'What evidence is available, missing or outside this page’s scope?';
  if(!evidenceReady)return [missing];
  const forecast=/\b(forecast|predict|prediction|predictive)\b/i.test(goal);
  const boundary='What historical evidence can inform my goal, and why is a validated forecast unavailable?';
  if(page==='home'||page==='overview'){
    if(!sources.some(source=>source.status==='loaded'&&hasKnownNumericEvidence(source.facts)))return [missing];
    if(page==='home'&&!focused)return [...homeGoalStarters];
    const topic=topics.find(topic=>topic.match.test(goal));
    const available=(ids:string[])=>sources.some(source=>ids.includes(source.id)&&source.status==='loaded'&&hasKnownNumericEvidence(source.facts));
    // Do not replace unavailable goal evidence with an unrelated confident example.
    const investigation=topic ? available(topic.ids)?topic.question:missing : focused?'Which available evidence relates to my goal, and what does it not establish?':'Which recorded workforce pattern is worth investigating, and what evidence supports it?';
    if(page==='home'&&!forecast&&topic?.ids.includes('T1')&&available(topic.ids))return [investigation,'What mix of training, internal moves and hiring would close our skills gaps?',hasConversation?'Which assumptions should I revise before comparing options?':'What would I need to specify before comparing Build, Move and Buy scenarios?'];
    return [forecast?boundary:investigation,focused?'Which supported options could address my goal, and what evidence would distinguish them?':'What can I investigate with the available workforce evidence?',hasConversation?'Which assumptions should I revise before comparing options?':'What would I need to specify before comparing Build, Move and Buy scenarios?'];
  }
  if(planningPages.has(page))return [forecast?boundary:'How do the available planning scenarios differ in assumptions and modeled costs?', 'Which budget, timing or headcount assumptions should I review for my goal?', 'What would make this scenario comparison incomplete or misleading?'];
  const first=pageExamples[page];
  if(!first)return [missing];
  return [forecast?boundary:first,focused?'How does this page’s evidence relate to my goal, and where is it insufficient?':'Which comparisons does this page’s evidence support?',hasConversation?'Which assumption or interpretation should I check next?':'What should I verify before using this evidence in a workforce plan?'];
}

// Examples accompany the existing focus-only Continue control, never a new action menu.
export const workforceStageExample:Partial<Record<import('./workforce-journey-state').JourneyStep,string>> = {
 'start-inputs':'Example: specify one role, a business unit and the additional positions needed.',
 'correct-inputs':'Example: confirm the missing count or date; leave optional costs unknown when unsupported.',
 'review-proposal':'Example: check each proposed count against your own planning statement.',
 'save-inputs':'Example: check the budget and timing in your unsaved assumptions.',
 calculate:'Example: review the saved Build, Move and Buy assumptions before calculating.',
 historical:'Example: inspect the inputs used by this saved calculation before comparing with a newer version.',
 compare:'Example: compare saved costs and timing, then inspect a saved calculation or reopen a pinned version. Candidate pools are not assignable capacity.',
 'review-alternatives':'Example: compare two temporary mixes within the bounds you confirmed.',
 'preview-tailoring':'Example: adjust a budget or start-date assumption and review its temporary comparison.',
 'save-solution':'Example: check the revised comparison against the original saved option before saving.',
};
