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
 'What workforce issues should we tackle first?',
 'Which teams need attention first based on the available workforce data?',
 'If support tickets rise 20% and payroll stays flat, how can we cover the work?',
 'For a client project starting in three months, should we train, redeploy or hire engineers?',
 'Can five recruiters handle 40 active requisitions without delaying priority hires?',
 'If client work grows 20% without more managers, how should we adjust workload?',
 'We need 10 engineers, but Finance capped the budget at $1 million. What are our options?',
 'If two projects end next quarter, where can we redeploy their people before hiring?',
 'How can we reduce turnover in the team with the highest recorded voluntary turnover?',
 'Which teams have the weakest satisfaction scores, and what should we change first?',
 'Where are candidates dropping out of our hiring process, and what should we fix first?',
 'Based on our current hiring and exits, what could headcount look like in six months?',
];
export const decisionStarterPrompts=[...decisionStarterLabels];
