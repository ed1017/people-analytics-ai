import type {AppPage} from './types';
// @ts-expect-error Native Node tests share TypeScript source.
import {appNavigationSections} from './app-navigation.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {planningJourney,planningEvidence} from './planning-journey.ts';

export const mainNavigation=[
 {key:'overview',label:'Overview',page:'home'},
 {key:'plan',label:'Plan',page:'planning-overview'},
 {key:'evidence',label:'Evidence',page:'workforce'},
] as const;
export type MainNavigationSection=typeof mainNavigation[number]['key'];
/** Section state is navigation context, never a claim that a planning step is complete. */
export function mainNavigationSection(page:AppPage):MainNavigationSection|null{
 if(page==='home')return 'overview';
 if(page==='assess-evaluate')return null;
 if(page==='workforce-planning'||appNavigationSections.find(s=>s.key==='strategy')!.pages.includes(page))return 'plan';
 return 'evidence';
}
const shortcuts=new Set<AppPage>(['home',...planningJourney.map(i=>i.page),...planningEvidence.map(i=>i.page)]);
export const secondaryNavigationSections=[
 {key:'evidence',title:'More evidence',pages:appNavigationSections.filter(s=>s.key==='analytics'||s.key==='talent').flatMap(s=>s.pages).filter(p=>!shortcuts.has(p))},
 {key:'plan',title:'Planning tools',pages:appNavigationSections.find(s=>s.key==='strategy')!.pages.filter(p=>!shortcuts.has(p))},
 {key:'evaluate',title:'Assess & Evaluate, coming soon',pages:appNavigationSections.find(s=>s.key==='evaluate')!.pages},
];
export function secondaryNavigationSection(page:AppPage){return secondaryNavigationSections.find(s=>s.pages.includes(page))?.key??null;}
