// Historical prompts retain routing coverage; decision starters are current UI copy.
export const planningPrompts=[
 'If we win three AI projects next year, should we hire engineers or move people from other projects?',
 'A client wants a new digital product in six months. Should we recruit more engineers if our managers are already stretched?',
 'If two new managed-services contracts bring more support tickets, should we hire specialists or train people from another team?',
 'We want more cloud modernization work. Should we train our engineers or hire specialists?',
 'If some client projects finish next quarter, which upcoming work could those teams move to?',
];
export const legacySkillsPrompts=[
 'What skills are we missing in the current workforce, and which findings apply to the selected scope?',
 'Where should we invest in training based on recorded skill gaps and learning pathways, and which findings apply to the selected workforce scope?',
];
export const challengePrompts=[
 'How can we reduce turnover based on recorded evidence, and which findings apply to the selected workforce scope?',
 'How can we improve employee satisfaction based on recorded feedback, and which findings apply to the selected workforce scope?',
 'How can we improve hiring based on recorded recruiting evidence, and which findings apply to the selected workforce scope?',
];

export const decisionStarterLabels=[
 'More support tickets, same payroll?',
 'Train, redeploy or hire for new client work?',
 'How many active requisitions can recruiters cover?',
 'Can managers support more delivery work?',
 'Can our hiring target fit Finance’s budget?',
];
export const decisionStarterPrompts=[
 'Hypothetical scenario: if support-ticket demand rose while payroll stayed flat, how could we cover the work without overloading another team?',
 'Hypothetical scenario: if new client work required skills we might not have available, should we train, redeploy or hire? Compare skill readiness, release dates, cost and delivery tradeoffs.',
 'Hypothetical scenario: if active requisitions increased, how should we balance recruiter workload, hiring priorities and additional recruiting capacity? Check requisition complexity and current commitments.',
 'Hypothetical scenario: before taking on more client delivery work, how could we check manager capacity for supervision, coaching and onboarding? Compare workload changes and additional management capacity.',
].map(prompt=>prompt+' Recommend an Action Plan using known inputs. Separate missing inputs from editable assumptions; do not invent numbers, available capacity or automation benefits.');

decisionStarterPrompts.push('Hypothetical scenario: could we add 3 support specialists over 6 months within a $120,000 Finance budget cap? Treat these as editable example inputs; confirm the role and salary from recorded role data or Finance input. Recommend an Action Plan using known inputs, checking feasibility where supported and comparing phased hiring, internal moves or a mix. Keep missing employer and recruiting costs explicit editable assumptions; do not claim unrun calculations or automation savings.');
