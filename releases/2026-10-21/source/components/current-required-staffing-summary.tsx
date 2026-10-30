'use client';
import type {ReactNode} from 'react';
import type {RequiredStaffingReview} from '@/lib/home-required-staffing';
import {currentRequiredStaffingSummary} from '@/lib/current-required-staffing-summary';
export function CurrentRequiredStaffingSummary({review,deliveryMonths=null,children}:{review:RequiredStaffingReview;deliveryMonths?:number|null;children?:ReactNode}){
 const summary=currentRequiredStaffingSummary(review,deliveryMonths);
 return <section aria-label="Current staffing revision" className="space-y-2 text-sm">
  <p className="font-semibold">Current staffing revision {summary.revision}</p>
  <p>{summary.requiredPeople===null?'Required people not entered':`${summary.requiredPeople} people required`}. {summary.decision}</p>
  <dl className="grid grid-cols-2 gap-2"><div><dt className="text-muted-foreground">Cost horizon</dt><dd>{summary.costHorizonMonths===null?'Not entered':`${summary.costHorizonMonths} months`}</dd></div><div><dt className="text-muted-foreground">Delivery target</dt><dd>{summary.deliveryMonths===null?'Not entered':`${summary.deliveryMonths} months`}</dd></div></dl>
  {summary.missing&&<p>Add {summary.missing} in the planner to complete the comparison.</p>}
  {children&&<details><summary className="min-h-11 cursor-pointer py-2 text-xs focus-visible:ring-2 focus-visible:ring-ring">Original answer before planner edits</summary>{children}</details>}
 </section>;
}
