/** Move only the known generic missing-fields inventory out of the main Home
 * answer. Facts, missing requested measures, qualifiers and saved text stay intact. */
export function homeAnswerPresentation(content:string) {
 const details:string[]=[],lines=content.split('\n');
 const answer=lines.filter(line=>{
  const match=line.match(/^\s*[-*]\s+((?:The )?available evidence does not provide (.+?), so stronger retention conclusions are unavailable\.\s*(?:\[S2\])?)\s*$/i);
  if(!match)return true;
  const fields=match[2].toLowerCase().split(/,\s*(?:or\s+|and\s+)?|\s+(?:or|and)\s+/).map(field=>field.trim());
  const known=new Set(['respondent-level detail','subgroup breakdowns','a fieldwork period','a comparison with non-exiting employees']);
  if(fields.length<3||!fields.every(field=>known.has(field)))return true;
  if(!details.includes(match[1]))details.push(match[1]);
  return false;
 }).join('\n');
 return answer.trim()?{answer,details}:{answer:content,details:[]};
}
