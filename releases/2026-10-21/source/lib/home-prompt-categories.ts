// Ordinary questions submit verbatim; the market starter opens an explicit scoped lookup.
// @ts-expect-error Native regression tests share the same source.
import {capacityRiskPrompt} from './group-capacity-risk.ts';
export const marketExplorationPrompt='What does the hiring market look like for a role?';
export const homePromptCategories = [
  {id:'explore',label:'Explore',prompts:[
    capacityRiskPrompt,
    'Which business unit has the highest voluntary turnover, and what should we investigate?',
    marketExplorationPrompt,
  ]},
  {id:'capacity',label:'Capacity Planning',prompts:[
    'How can we close a staffing gap?',
    'Project headcount over six months assuming five hires and three exits per month. Label this as a hypothetical scenario.',
  ]},
  {id:'future',label:'Future of Work',prompts:[
    'Which skills appear in our recorded gap list?',
    'Which roles have recorded learning pathways?',
  ]},
] as const;
