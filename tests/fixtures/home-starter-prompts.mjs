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
 'What do recorded separation patterns show, and what remains unexplained?',
 'Which recorded workforce changes deserve attention? Show the supporting figures and scope limits.',
 "We need 10 additional people within 3 months. Assume 4 can transfer internally, 3 can be trained at $5,000 each, and 3 must be hired at $160,000 each in first-year cost. Training takes 80 hours per person. Recommend one action plan with cost, timing, resources and key assumptions.",
 'Project headcount over six months assuming five hires and three exits per month. Label this as a hypothetical scenario.',
];
export const decisionStarterPrompts=[...decisionStarterLabels];
