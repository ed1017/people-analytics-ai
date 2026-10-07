// Constructed aggregates only: reason rows compete with twelve lexical question matches.
export const refreshedExitReasonQuestion='The evidence has been refreshed. What reasons do employees give for leaving in the exit survey? Show a chart using exit-survey reasons and distinguish them from administrative separation records.';
export const exitReasonQuestion='What reasons do employees give for leaving in the exit survey?';
export const exitReasonFixture=()=>({as_of:'2026-09-30',summary:{exit_respondents:50,manager_favorable_pct:19.9},exit_reasons:[
 {primary_reason:'Manager',exits:15,pct_of_exit_responses:30},
 {primary_reason:'Work-Life Balance',exits:20,pct_of_exit_responses:40},
 {primary_reason:'New Opportunity',exits:10,pct_of_exit_responses:20}
],exit_dimensions:Array.from({length:12},(_,i)=>({survey_code:'EXIT',question_code:'Q'+i,question_text:'What reasons do employees give for leaving in the exit survey? Distinguish from administrative separation records.',respondents:50,avg_score:3,favorable_pct:60}))});
export const exitReasonAnswer='Exit-survey feedback is available after refresh; these reports do not establish causes.\n- Supplied reasons among 50 exit-survey respondents, company-wide as of 30 Sep 2026: [S2]\n  - Work-Life Balance: 20 (40%). [S2]\n  - Manager: 15 (30%). [S2]\n  - New Opportunity: 10 (20%). [S2]\n- Administrative separation records use a different population. Fieldwork dates and complete suppression metadata are unavailable. [S2]';
export const unavailableExitReasonAnswer='Exit-survey reasons are unavailable; I have no counts for Work-Life Balance or Manager. [S2] Administrative separation counts cannot establish survey reasons. [A1]';
