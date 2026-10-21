export function validHistoryDate(value:unknown):value is string {
 if(typeof value!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])-\d{2}$/.test(value))return false;
 const date=new Date(value+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
