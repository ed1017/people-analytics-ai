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
 'How can we reduce turnover?',
 'How can we improve satisfaction?',
 'How can we improve hiring?',
];
export const decisionStarterPrompts=[...decisionStarterLabels];
