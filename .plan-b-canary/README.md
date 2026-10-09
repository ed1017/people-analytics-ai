# Zero-provider Plan B canary

This separate source tests only whether a manually selected Git Preview can run
the reviewed source-contained build configuration while automatic Git deployment
remains disabled for this branch. It does not test an app, provider, model or data.

The build uses Node built-ins only. The install command prints the Node version;
it neither installs application dependencies nor runs package lifecycle scripts.
The build does not import application/provider code, read credentials, start an
HTTP listener, or make network/database calls. It verifies every originally pinned
application/support file, except for the exact reviewed Vercel config overlay,
then writes only blank static HTML. Its marker contains nonsecret source/build
identities and digests. No receipts or source files are served.

Select the exact reviewed commit in the existing **ed-56dc/people-analytics-ai**
project and choose this branch's **Preview** configuration. The source guard checks
the repository, exact branch and Preview target, requires platform project and
deployment IDs, and reports those IDs for comparison with the operator's selected
project. The project ID is not yet independently pinned in this source; the
operator must verify that UI binding before any manual deployment. Preserve
Standard Vercel Authentication and all existing settings/credential scopes.

This branch is not approved for production, a PR or a paid run. Manual deployment
still requires coordinator review and authorization. The original application
source and manifest at `02ddda844bcd4470a9dac9c015ed56b519ae6d68` remain untouched.
Only this README, the canary script and vercel.json differ from that source.
There is no online mode or execution switch. Plan D is independent of this canary.
