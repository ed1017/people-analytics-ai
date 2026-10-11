/** Mark explicit caveat blocks for compact typography; never hide or rewrite prose. */
const label = '(?:Important caveats?|Caveats?|Assumptions?(?: & limits)?)';
const heading = new RegExp('^#{1,3}\\s+(?:\\*\\*)?'+label+'(?:\\*\\*)?\\s*:?\\s*$','i');
const paragraph = new RegExp('^(?:\\*\\*'+label+':\\*\\*|\\*\\*'+label+'\\*\\*:|'+label+':)(?:\\s|$)','i');

export function chatCaveatLineNumbers(content:string):number[] {
 const lines=content.split('\n'),marked:number[]=[];
 let fence:string|null=null;
 for(let i=0;i<lines.length;){
  const trimmed=lines[i].trim(),marker=trimmed.match(/^(`{3,}|~{3,})/)?.[1];
  if(marker){
   if(!fence)fence=marker;
   else if(marker[0]===fence[0]&&marker.length>=fence.length)fence=null;
   i++;continue;
  }
  const eligible=!fence&&!/^(?: {4}|\t)/.test(lines[i]);
  const isHeading=eligible&&heading.test(trimmed);
  const boundary=i===0||!lines[i-1].trim()||/^#{1,3}\s/.test(lines[i-1]);
  if(!isHeading&&!(eligible&&boundary&&paragraph.test(trimmed))){i++;continue;}
  let end=i+1;
  while(end<lines.length&&!/^#{1,6}\s|^```|^~~~/.test(lines[end].trim())&&(isHeading||lines[end].trim()))end++;
  for(let line=i;line<end;line++)if(lines[line].trim())marked.push(line);
  i=end;
 }
 return marked;
}
