# Shortened Home introduction

The introduction now opens with the staffing problem: cover a gap within the available time and budget. The first section in the reading area gives the same supported attribution as About: Ed Om defined the workforce-planning problem, product requirements and acceptance criteria; AI assisted with implementation, design and testing.

Six sections become two. The second briefly compares developing people, moving people internally and hiring against cost, readiness and uncovered work. It retains the explicit fictional 5-FTE demo boundary. Default dialog text decreases from 246 to 88 words, including action labels, contacts and new-tab announcements. No professional achievements or realized workforce outcomes are added.

The detailed four-step exercise stays in the existing guided tutorial, and methods and project detail remain in About. The introduction keeps its existing button and link names, opt-out label, dialog title, scrolling region and persistent action area. No navigation, lifecycle, calculation, workforce data or provider behavior changes accompany the copy edit.

## Local verification

- All 26 Home orientation tests pass, including six added interaction regressions. Coverage includes loading/busy/inactive entry guards, recovery deferral, explicit reopen and dismissal, visible-trigger and fallback focus restoration, keyboard boundary handling, opt-out persistence and storage failures, and the distinction between starting the demo and exploring.
- All 82 tests across the orientation, About, guided-window, tutorial, shared-planner, staffing-flow, saved-version, theme and prompt suites pass. The tutorial still requires explicit prompt submission, comparison, choice, review and save.
- Focused ESLint, TypeScript, prebuild artifact verification, the production build and postbuild output audit pass.
- The source manifest verifies all 1,195 public files. The isolated complete QA runtime uses that exact source overlay, the existing locked dependencies and all 145 unchanged runtime-only inputs. None of those excluded inputs is added to this change.
- Checks use an external-network guard. No provider call, deployment or persistent service/configuration change is made.

Actual browser rendering, native dialog interaction and desktop/phone layout acceptance are **unrun** for this candidate. The event-handler harness and source contracts are not substitutes for those browser checks. Publication must retain that distinction.
