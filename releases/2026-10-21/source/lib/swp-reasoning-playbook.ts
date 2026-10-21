/** Original application guidance, adapted to professional services from public sources.
 * Sources describe planning methods, never facts about this workforce or measured effects.
 * Only requested sections enter model context; no runtime web access or source PDF copies.
 */
export const swpPlaybookSources={
 cipd:{title:'CIPD workforce planning standards',url:'https://www.cipd.org/uk/the-people-profession/the-profession-map/explore-the-profession-map/specialist-knowledge/workforce-planning/'},
 skillsForHealth:{title:'Skills for Health Six Steps overview',url:'https://www.skillsforhealth.org.uk/integrated-solutions/workforce-development/six-step-methodology/'},
 opm:{title:'OPM workforce planning model',url:'https://www.opm.gov/policy-data-oversight/human-capital-framework/reference-materials/strategic-alignment/workforceplanning.pdf'},
};
const sections={
 demand:{title:'Business outcome and workload',sources:['cipd','skillsForHealth'],guidance:
  'Start from the client outcome, delivery horizon, service quality and current commitments. Distinguish committed work from uncertain pipeline; compare conditional demand scenarios rather than treating every bid as won. Name workload units, effort per unit, period, location and coverage needs. Use the existing workload calculator only for its supported units and scope. Headcount, revenue growth and service promises alone do not establish productive capacity. State the missing decision-changing input without delaying useful provisional plans.'},
 supply:{title:'Available capability and management capacity',sources:['skillsForHealth','opm'],guidance:
  'Compare the required work with skills, proficiency and time actually available after current commitments, leave and release conditions. Enough employees may still mean the wrong skills. Assess supervision and span of control in context; a manager count is not management bandwidth. Check onboarding, training and ramp lead times, trainer effort, source-team backfill and dependencies. No universal staffing ratio, assessment score or planned course proves deployment readiness. Preserve missing availability and skill evidence as unknown; do not relabel company headcount as a ready team.'},
 options:{title:'Constrained alternatives and sequenced combinations',sources:['cipd','opm'],guidance:
  'Compare relevant hiring, skill development, redeployment, contracting, automation and demand reprioritisation, including useful sequences. A hiring freeze does not authorize contracting or backfills; clarify its scope after offering allowed conditional paths. Fixed budget plus growth may require smaller scope, timing changes or an explicit unmet gap. Automation is a proposed change with implementation cost and uncertain benefits: do not count capacity or savings before the assumed validated release/ramp date. If constraints rule out every checked mix, explain that result and offer a reversible next action; never manufacture feasibility.'},
 resources:{title:'Keep capacity, time and cash distinct',sources:['cipd'],guidance:
  'AI proposes and explains; existing code calculates headcount, workload and costs from supported typed inputs. Keep units, dates and denominators aligned. Internal transfers change group supply, not company headcount. Do not allocate the same people to baseline work and multiple new paths. Shared participants, source-team release, backfills and overlapping fees require explicit applicable evidence or assumptions. Do not sum alternative-plan capacity or savings. Keep cash expenses separate from employee hours; unlisted costs remain unknown. Training and automation do not create proven productivity or causal turnover benefits.'},
 delivery:{title:'Delivery and iterative review',sources:['skillsForHealth','opm'],guidance:
  'For each useful plan, name proposed owner roles, a first action, milestones or dependency gates, risks and measures. Roles are suggestions, not assignments. Separate implementation effort, hiring/training lead times and when outcomes could be assessed. Compare progress with a scoped dated baseline and current commitments; record new information through the existing explicit review flow. Refresh assumptions and the recommendation when answers or measured results change. Preserve prior revisions and source lineage; no automatic tracking entry, approval, save or implementation follows from a conversation.'},
} as const;
export const swpPlaybookSectionIds=Object.keys(sections) as Array<keyof typeof sections>;
export const swpPlaybookTool={
 type:'function' as const,name:'read_workforce_planning_playbook',strict:true,
 description:'Read one or two relevant sections of original workforce-planning method guidance with public-source attribution: demand, supply, options, resources or delivery. Optional for complex planning; skip ordinary factual questions. This local read uses the existing tool budget, returns no workforce facts or calculations, and makes no web request.',
 parameters:{type:'object',additionalProperties:false,required:['sections'],properties:{sections:{type:'array',minItems:1,maxItems:2,items:{type:'string',enum:swpPlaybookSectionIds}}}},
};
export function readSwpPlaybook(raw:unknown){
 if(!Array.isArray(raw)||raw.length<1||raw.length>2||new Set(raw).size!==raw.length||raw.some(id=>!swpPlaybookSectionIds.includes(id)))throw Error('Select one or two distinct supported planning sections.');
 const selected=(raw as Array<keyof typeof sections>).map(id=>({id,...sections[id],sources:[...sections[id].sources]}));
 const sources=[...new Set(selected.flatMap(section=>[...section.sources]))].map(id=>({id,...swpPlaybookSources[id]}));
 return {version:1,kind:'planning-method-guidance',observedWorkforceEvidence:false,measuredBenefits:false,
  adaptation:'Original professional-services guidance; no source endorsement or workforce validation.',
  sections:selected,sources};
}
