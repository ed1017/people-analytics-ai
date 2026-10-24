export type PlanningSliderSpec = {min:number;max:number;precision:number;keyboardStep:number;extent:number;unit:string;preservePrecision?:boolean};
export const discreteMonths=(spec:PlanningSliderSpec)=>spec.precision===0&&/^months?(?: index)?$/i.test(spec.unit);
// Bounds and precision match the existing monthly workload adapter/engine.
export const capacitySliders:Record<string,PlanningSliderSpec>={
 months:{min:1,max:6,precision:0,keyboardStep:1,extent:6,unit:'months'},
 hires:{min:0,max:1e6,precision:0,keyboardStep:1,extent:100,unit:'people / month'},
 exits:{min:0,max:1e6,precision:0,keyboardStep:1,extent:100,unit:'people / month'},
 volume:{min:0,max:1e6,precision:6,keyboardStep:100,extent:10000,unit:'work units / month'},
 allocation:{min:0,max:100,precision:4,keyboardStep:1,extent:100,unit:'%'},
 productivity:{min:0,max:100,precision:4,keyboardStep:1,extent:100,unit:'%'},
};
export function sliderNumber(value:string,spec:PlanningSliderSpec):number|null {
 if(discreteMonths(spec)){const n=Number(value);return value.trim()!==''&&Number.isInteger(n)&&n>=spec.min&&n<=spec.max?n:null;}
 if(spec.preservePrecision){const n=Number(value);return value.trim()!==''&&Number.isFinite(n)&&n>=spec.min&&n<=spec.max?n:null;}
 if(!/^\d+(?:\.\d{1,6})?$/.test(value.trim()))return null;
 const n=Number(value);
 return Number.isFinite(n)&&n>=spec.min&&n<=spec.max&&Number(n.toFixed(spec.precision))===n?n:null;
}
export function sliderExtent(value:string,spec:PlanningSliderSpec){
 const n=sliderNumber(value,spec);
 return Math.min(spec.max,Math.max(spec.extent,n===null?0:10**Math.ceil(Math.log10(Math.max(n,1)))));
}
export function sliderEdit(value:number,spec:PlanningSliderSpec){
 if(discreteMonths(spec))return String(Math.round(Math.min(spec.max,Math.max(spec.min,value))));
 if(spec.preservePrecision)return String(Math.min(spec.max,Math.max(spec.min,value)));
 return String(Number(Math.min(spec.max,Math.max(spec.min,value)).toFixed(spec.precision)));
}
