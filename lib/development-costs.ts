export type DevelopmentQuote = {
  id: string; provider: string; kind: "Training" | "Leadership coaching";
  focus: string; format: string; hours: string; sessions: string; capacity: string;
  currency: "USD" | "EUR" | "GBP"; basis: "person" | "cohort"; fee: string;
  provenance: "simulated" | "user-provided";
};
export const developmentCatalog: DevelopmentQuote[] = [
  { id: "fictional-1", provider: "Fictional Cedar Learning", kind: "Training", focus: "Manager feedback and delegation", format: "Live virtual workshop", hours: "2", sessions: "3", capacity: "12", currency: "USD", basis: "person", fee: "120", provenance: "simulated" },
  { id: "fictional-2", provider: "Fictional Lantern Academy", kind: "Training", focus: "Data literacy and business communication", format: "In-person cohort", hours: "3", sessions: "2", capacity: "10", currency: "USD", basis: "cohort", fee: "1800", provenance: "simulated" },
  { id: "fictional-3", provider: "Fictional Harbor Coach", kind: "Leadership coaching", focus: "Leadership reflection and difficult conversations", format: "Individual virtual coaching", hours: "1", sessions: "4", capacity: "1", currency: "USD", basis: "cohort", fee: "200", provenance: "simulated" },
];
export const blankDevelopmentQuote = (): DevelopmentQuote => ({ id: "", provider: "", kind: "Training", focus: "", format: "", hours: "", sessions: "", capacity: "", currency: "USD", basis: "person", fee: "", provenance: "user-provided" });
export type DevelopmentInputs = { participants: string; sessions: string; hours: string; fee: string; additionalFees: string; hourlyCost: string };
export type DevelopmentOption = { quote: DevelopmentQuote; goal: string; inputs: DevelopmentInputs };
export function quoteInputs(quote: DevelopmentQuote): DevelopmentInputs {
  return { participants: "", sessions: quote.sessions, hours: quote.hours, fee: quote.fee, additionalFees: "", hourlyCost: "" };
}
function numberInput(value: string, label: string, max: number, integer = false, positive = false): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(n) || n > max || n < 0 || (positive && n === 0) || (integer && !Number.isInteger(n))) throw new Error(`${label}: enter ${positive ? "a positive" : "a nonnegative"} ${integer ? "whole number" : "number with up to two decimals"} up to ${max}.`);
  return n;
}
export function validateQuote(q: DevelopmentQuote): string[] {
  const errors: string[] = [];
  if (!q.provider.trim() || !q.focus.trim() || !q.format.trim()) errors.push("Enter provider, focus/skills and format.");
  for (const [value, label, max, integer, positive] of [[q.hours,"Hours",100,false,true],[q.sessions,"Sessions",1000,true,true],[q.capacity,"Capacity",10000,true,true],[q.fee,"Fee",1000000,false,false]] as const) {
    try { numberInput(value,label,max,integer,positive); } catch(e) { errors.push((e as Error).message); }
  }
  return errors;
}
export function developmentCost(q: DevelopmentQuote, input: DevelopmentInputs) {
  const errors: string[] = [];
  const read = (v: string, label: string, max: number, integer = false, positive = false) => { try { return numberInput(v,label,max,integer,positive); } catch(e) { errors.push((e as Error).message); return null; } };
  const participants = read(input.participants,"Participants",10000,true,true);
  const sessions = read(input.sessions,"Sessions",1000,true,true);
  const hours = read(input.hours,"Hours per participant per session",100,false,true);
  const capacity = read(q.capacity,"Cohort capacity",10000,true,true);
  const fee = read(input.fee,"Quote fee",1000000);
  const additional = read(input.additionalFees,"Additional fees",1000000);
  const hourlyCost = read(input.hourlyCost,"Loaded hourly cost",1000000);
  const cohorts = participants !== null && capacity !== null ? Math.ceil(participants / capacity) : null;
  const round = (n: number) => Math.round(n * 100) / 100;
  const units = q.basis === "person" ? participants : cohorts;
  const quoteTotal = units !== null && sessions !== null && fee !== null ? round(units * sessions * fee) : null;
  const employeeHours = participants !== null && sessions !== null && hours !== null ? round(participants * sessions * hours) : null;
  const timeCost = employeeHours !== null && hourlyCost !== null ? round(employeeHours * hourlyCost) : null;
  const cashCost = quoteTotal !== null && additional !== null ? round(quoteTotal + additional) : null;
  const total = cashCost !== null && timeCost !== null ? round(cashCost + timeCost) : null;
  return { errors, cohorts, quoteTotal, employeeHours, timeCost, cashCost, total };
}
