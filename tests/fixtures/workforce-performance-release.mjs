// Local display-contract fixture. Company counts supplied in recovery handoff;
// BU counts are test-only values, never a claim about staged BU contents.
export function performanceFixture(org = 'all') {
  const ratings = org === 'all' ? [400,1200,5200,2600,600] : [40,120,520,260,60];
  const population = ratings.reduce((a,b) => a+b,0);
  return { version:'workforce-performance-2026-ytd-bu-v1', source:'employee_snapshots JOIN performance_reviews', snapshotDate:'2026-09-30', reviewPeriod:'2026 YTD', filters:{country:'all',org,level:'all'}, status:'available', availabilityKind:'simulated_convention', simulatedAvailableAt:'2026-09-30T23:59:59.999Z', originalAvailableAt:null, contentDigest:'191ff33a4dd66c0e6484627441928a77fbb3ef883b428261964d768a65e9535c', counts:{population,rated:population,ratings,notRated:null,notRatedStatus:'not_collected',unavailable:0} };
}

export function performanceWireFixture(org='all') {
 const f=performanceFixture(org),{contentDigest,counts,...metadata}=f;
 const {notRatedStatus,...wireCounts}=counts;
 return {...metadata,periodKind:'ytd',provenance:'Synthetic workforce; exact rating generation unverified',notRatedStatus,counts:wireCounts,release:{contentSha256:contentDigest,extractedAt:'2026-10-06T14:23:25.171Z',publishedAt:'2026-10-06T16:00:00.000Z'}};
}
