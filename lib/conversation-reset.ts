/** Reset hides the active conversation prefix; saved transcript records remain intact. */
export function conversationBoundary(marks:unknown,scope:string,length:number):number {
 if(!marks||typeof marks!=='object'||Array.isArray(marks))return 0;
 const value=(marks as Record<string,unknown>)[scope];return Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=length?Number(value):0;
}
export function resetConversationMarks(marks:Record<string,number>,scope:string,length:number){return {...marks,[scope]:length};}
