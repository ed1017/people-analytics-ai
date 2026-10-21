const small=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
// The saved catalog supports at most thirty stable plan numbers. Digits outside
// that range are still read so the catalog can report an unavailable reference.
export const planNumberPattern='(?:\\d+|twenty(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?|thirty|'+small.join('|')+')';
const boundary='(?![\\w]|[.,-]\\d)';
const value=(text:string)=>/^\d+$/.test(text)?Number(text):text==='thirty'?30:text.startsWith('twenty')?20+(small.indexOf(text.slice(7))>0?small.indexOf(text.slice(7)):0):small.indexOf(text);

/** Read labelled references and their coordinated list, never unrelated amounts. */
export function planReferenceNumbers(text:string):number[]{
 const found=new Map<number,number>();
 const explicit=new RegExp('(?:\\b(?:action\\s+)?plans?\\s*#?\\s*|#)('+planNumberPattern+')'+boundary,'gi');
 const continuation=new RegExp('^\\s*(?:and|with|\\+|&|,)\\s*(?:(?:action\\s+)?plans?\\s*)?#?\\s*('+planNumberPattern+')'+boundary,'i');
 for(const match of text.matchAll(explicit)){
  let end=match.index+match[0].length;
  found.set(end-match[1].length,value(match[1].toLowerCase()));
  let next:RegExpMatchArray|null;
  while((next=text.slice(end).match(continuation))){
   end+=next[0].length;found.set(end-next[1].length,value(next[1].toLowerCase()));
  }
 }
 return [...found].sort(([a],[b])=>a-b).map(([,number])=>number);
}
