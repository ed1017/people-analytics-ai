/** A conversation spans topics. Keep its archived prefix hidden on every page. */
export function conversationBoundary(marks:unknown,scope:string,length:number):number {
 if(!marks||typeof marks!=='object'||Array.isArray(marks))return 0;
 const boundary=(key:string)=>{const value=(marks as Record<string,unknown>)[key];return Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=length?Number(value):0;};
 // Retain compatibility with older page-scoped reset records.
 return Math.max(boundary('*'),boundary(scope));
}
export function resetConversationMarks(marks:Record<string,number>,scope:string,length:number){return {...marks,[scope]:length,'*':length};}
