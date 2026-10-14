/** Rebuild recipe only. The server verifies its identity and resulting evidence. */
export function readCandidateHomeContext(raw) {
  const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const keys=(v,k)=>object(v)&&Object.keys(v).sort().join(',')===[...k].sort().join(',');
  const aggregate=raw?.dashboardAggregate;
  if(!keys(raw,['datasetId','datasetToken','bundleDigest','cutoff','filters','selectionGoal','session',...(aggregate===undefined?[]:['dashboardAggregate'])]) ||
    aggregate!==undefined&&(!keys(aggregate,['artifactDigest','metricContract'])||!/^[a-f0-9]{64}$/.test(aggregate.artifactDigest)||aggregate.metricContract!=='voluntary-ytd-nine-month-average-stock-v2')||
    raw.datasetId!=='workforce-demo-9847-2026-09-30-local-final-v1' ||
    !new RegExp('^'+raw.datasetId+':[0-9]{1,12}$').test(raw.datasetToken) ||
    !/^[a-f0-9]{64}$/.test(raw.bundleDigest)||raw.cutoff!=='2026-09-30'||
    !keys(raw.filters,['country','org','level'])||!Object.values(raw.filters).every(v=>typeof v==='string'&&v.length>0&&v.length<=100)||
    typeof raw.selectionGoal!=='string'||raw.selectionGoal.length>6000||!object(raw.session)||
    Object.keys(raw.session).some(k=>!['custom','options','selected'].includes(k))||
    JSON.stringify(raw.session).length>12000) throw Error('Current candidate Home context required.');
  return structuredClone(raw);
}
