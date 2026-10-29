import type { AppPage } from './types';

/** Navigation guidance only: visiting a destination does not complete a step. */
export const planningJourney: {page: AppPage; label: string}[] = [
  {page: 'workforce', label: 'Baseline'},
  {page: 'future-of-work', label: 'Future of Work'},
  {page: 'planning-overview', label: 'Scenarios'},
  {page: 'position-workforce-design', label: 'Talent inventory'},
  {page: 'action-plans', label: 'Action plans'},
  {page: 'plan-track', label: 'Track'},
];

export const planningEvidence: {page: AppPage; label: string}[] = [
  {page: 'attrition', label: 'Attrition'},
  {page: 'skills', label: 'Skills'},
  {page: 'labor-market', label: 'Labor market'},
  {page: 'compensation', label: 'Pay and cost'},
];
