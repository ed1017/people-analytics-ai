export type CountryOption = {value:string; label:string};
export function requestedHomeCountries(question:string, options:CountryOption[], selected:string) {
  if (/\b(?:BLS|OEWS|unemployment|labor force participation)\b/i.test(question)) return {kind:"none" as const, options:[] as CountryOption[]};
  const names = new Map(options.map(o=>[o.value,o.label]));
  for(const [code,label] of [["US","United States"],["CA","Canada"],["MX","Mexico"],["GB","United Kingdom"],["IN","India"],["DE","Germany"],["FR","France"],["AU","Australia"],["JP","Japan"],["CN","China"],["BR","Brazil"],["SG","Singapore"]]) if(!names.has(code))names.set(code,label);
  const found = [...names].filter(([code,label])=>{
    const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
    return new RegExp("\\b"+escaped+"\\b","i").test(question) || (code==="US" && /\b(?:US|USA)\b|\bU\.S\.(?:A\.)?/.test(question)) || (code==="GB" && /\bUK\b|\bBritain\b/i.test(question));
  }).map(([value,label])=>({value,label,supported:options.some(o=>o.value===value)}));
  if (!found.length || (found.length===1 && found[0].value===selected)) return {kind:"none" as const,options:[] as CountryOption[]};
  return {kind:found.some(o=>!o.supported)?"unsupported" as const:found.length>1?"ambiguous" as const:"apply" as const,options:found.filter(o=>o.supported).map(({value,label})=>({value,label}))};
}
