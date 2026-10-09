export function sanitize(value,knownSecret='') {
  let redacted=false;
  const text=JSON.stringify(value,(_key,item)=>{
    if(typeof item!=='string')return item;
    let safe=item.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').replace(/[\x00-\x08\x0b-\x1f\x7f]/g,'')
      .replace(/(?:sk-[A-Za-z0-9_-]{8,}|github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9]+|Bearer\s+\S+)/gi,'[REDACTED]');
    if(knownSecret)safe=safe.split(knownSecret).join('[REDACTED]');
    redacted ||= safe!==item;return safe;
  });
  return {sanitization:{redacted,truncated:false},receipt:JSON.parse(text)};
}
