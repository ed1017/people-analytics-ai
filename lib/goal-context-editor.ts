// @ts-expect-error Native Node tests share TypeScript source.
import {addGoalNote,emptyGoalRequirements,normalizeGoalRequirements,type GoalRequirements} from './goal-context.ts';
// @ts-expect-error Native Node tests share TypeScript source.
import {homeUserGoalForPin} from './home-planning-intent.ts';
import type {LocalGoals} from './local-goals';
export type GoalEditorSource={page:string;scope:string};
export type GoalContextEditor={id:string;draft:string;create:boolean;originGoalId:string;originStatement:string;originContext:string;source:GoalEditorSource;requirements:GoalRequirements;seedStatement:string;seedContext:GoalRequirements;contextEdited:boolean};
/** Copy user text only. Original bounded notes and their provenance remain intact below the editable field. */
export function prefillGoalContext(raw:unknown):GoalRequirements{
 const context=normalizeGoalRequirements(raw);if(context.constraints)return context;
 const text=context.notes.map(note=>note.text).join('\n');
 const suffix='… (continued in retained user statements)';
 context.constraints=text.length<=600?text:text.slice(0,600-suffix.length).trimEnd()+suffix;return context;
}
export function recordExplorationGoalContext(previous:GoalRequirements,text:string,page:string,scope:string):GoalRequirements{
 const oldGoal=homeUserGoalForPin(previous.notes.map(note=>note.text)),nextGoal=homeUserGoalForPin([text]);
 return addGoalNote(nextGoal&&oldGoal&&nextGoal!==oldGoal?emptyGoalRequirements():previous,text,page,scope);
}
export function openGoalContextEditor(goals:LocalGoals,create:boolean,exploration:GoalRequirements,source:GoalEditorSource,id:string):GoalContextEditor{
 const active=goals.goals.find(goal=>goal.id===goals.activeId),isNew=create||!active;
 const seedStatement=isNew&&!active?homeUserGoalForPin(exploration.notes.map(note=>note.text))??'':'';
 const seedContext=isNew?(seedStatement?normalizeGoalRequirements({...exploration,decisions:''}):emptyGoalRequirements()):normalizeGoalRequirements(active?.context);
 return {id,draft:isNew?seedStatement:active!.statement,create:isNew,originGoalId:goals.activeId,originStatement:active?.statement??'',originContext:JSON.stringify(normalizeGoalRequirements(active?.context)),source:{page:source.page||'Page unavailable',scope:source.scope||'Scope unavailable'},requirements:prefillGoalContext(seedContext),seedStatement,seedContext,contextEdited:false};
}
export function goalContextEditorCurrent(editor:GoalContextEditor,goals:LocalGoals):boolean{
 const active=goals.goals.find(goal=>goal.id===goals.activeId);return editor.originGoalId===goals.activeId&&editor.originStatement===(active?.statement??'')&&editor.originContext===JSON.stringify(normalizeGoalRequirements(active?.context));
}
export function changeGoalEditorStatement(editor:GoalContextEditor,draft:string):GoalContextEditor{
 if(!editor.create)return {...editor,draft};
 // Changing the new goal invalidates imported exploration context. Typed goal text has current editor provenance.
 const source=draft.trim()===editor.seedStatement?editor.seedContext:addGoalNote(emptyGoalRequirements(),draft,editor.source.page,editor.source.scope);
 const requirements=prefillGoalContext(source);
 requirements.decisions=editor.requirements.decisions;
 if(editor.contextEdited)requirements.constraints=editor.requirements.constraints;
 return {...editor,draft,requirements};
}
