import {readHomeSurveyGroups} from './home-survey-groups.mjs';

/** Source-owned complete partition. Values are never extracted from generated prose. */
export function surveyComparisonVisual(value){
 const groups=readHomeSurveyGroups(value);
 if(!groups)return null;
 return {...groups,rows:[...groups.rows].sort((a,b)=>a.favorable_pct-b.favorable_pct||a.org_code.localeCompare(b.org_code))};
}

/** Remove only a complete duplicate markdown table; retain narrative and qualifications. */
export function omitDuplicateComparisonTable(answer,rows){
 const lines=answer.split('\n');let output=[];
 for(let i=0;i<lines.length;){
  if(!/^\s*\|/.test(lines[i])){output.push(lines[i++]);continue;}
  const start=i;while(i<lines.length&&/^\s*\|/.test(lines[i]))i++;
  const block=lines.slice(start,i),data=block.filter(line=>!/^\s*\|[\s:|-]+\|?\s*$/.test(line));
  const parse=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(cell=>cell.trim().replace(/\*\*/g,''));
  const headers=parse(data[0]??'').map(s=>s.toLowerCase()),cells=data.slice(1).map(parse);
  const kinds=headers.map(h=>/^(?:business unit|bu|group)$/.test(h)?'label':/^(?:favorability|favourability|favorable|favorable %|favorability %)$/.test(h)?'favorable_pct':/^(?:average score|avg score|average score \(1[–-]5\))$/.test(h)?'avg_score':h==='respondents'?'respondents':null);
  const complete=rows.length>0&&kinds.length>=2&&kinds.every(Boolean)&&new Set(kinds).size===kinds.length&&kinds.includes('label')&&cells.length===rows.length&&rows.every(row=>cells.some(c=>c.length===kinds.length&&kinds.every((kind,j)=>kind==='label'?(c[j]===row.org_code||c[j]===row.org_name):/^\d+(?:\.\d+)?%?$/.test(c[j].replace(/,/g,''))&&Number(c[j].replace(/[,%]/g,''))===row[kind])));
  output.push(...(complete?['The complete comparison is shown in the answer visuals.']:block));
 }
 return output.join('\n');
}
