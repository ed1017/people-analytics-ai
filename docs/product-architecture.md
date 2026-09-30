# Product Architecture

## What this product is becoming

This is a public People Analytics + Strategic Workforce Planning product with an AI assistant built across the experience.

The goal is not to make another dashboard with a chatbot stuck on the side.

The product should help someone move from:

1. understanding the workforce,
2. to modeling future demand,
3. to designing the workforce,
4. to deciding how to close gaps,
5. to testing whether the plan is actually executable.

The AI should help across that whole flow, but deterministic analytics and governed data stay responsible for the actual calculations.

---

## Locked product direction

### Workforce AI

Workforce AI sits above the functional areas as the cross-domain assistant.

It should be able to answer questions across Workforce Analytics, Talent Management, and Workforce Strategy & Planning by calling governed tools instead of guessing from one giant prompt.

### Workforce Analytics

- Workforce Overview
- Attrition
- Talent Acquisition
- Compensation
- Survey & Sentiment

This is the core measurement layer: what is happening in the workforce, where it is happening, and what stands out.

### Talent Management

- Skills Intelligence
- Learning & Development
- Career & Mobility
- Succession Planning
- Internal Talent / Readiness

This is the talent supply layer: what capabilities we have, what people want to do next, and where internal development or movement may help.

### Workforce Strategy & Planning

- Planning Overview
- Scenario Modeling
- Position & Workforce Design
- Workforce Response
- Execution & Feasibility
- Workforce Forecasting
- Labor Cost Planning

This is the decision layer: what workforce we need, what changes, how we respond, and whether the plan can actually be delivered.

---

## Workforce Planning workflow

The current Workforce Planning experience follows four steps:

**Plan -> Design -> Respond -> Execute**

### 1. Plan

Question: **What workforce do we think we will need?**

This includes:

- enterprise workforce scenarios,
- custom planning assumptions,
- business-unit what-ifs,
- saved scenario comparison,
- headcount / FTE / labor-cost trajectories.

The future Planning Overview should stay small and executive-level. The detailed scenario work belongs in Scenario Modeling.

### 2. Design

Question: **What positions actually need to change?**

This includes:

- authorized-position modeling,
- add / close / freeze / fill actions,
- ordered structural actions by BU, level, and job profile,
- role-demand changes,
- recruiting-demand changes,
- skill-demand changes,
- business-unit ownership of modeled demand.

This will eventually become the Position & Workforce Design page.

### 3. Respond

Question: **How do we close the workforce gaps?**

This includes:

- Build / Move / Buy planning,
- internal talent readiness,
- development-pathway coverage,
- external recruiting feasibility,
- role-level response plans,
- multi-role response portfolios,
- BU destination allocation.

This will eventually become the Workforce Response page.

### 4. Execute

Question: **Can we actually pull the plan off?**

This includes:

- time-phased Build / Move / Buy execution,
- monthly effective capacity,
- explicit hard constraints,
- deadline coverage requirements,
- combined monthly capacity limits,
- deterministic auto-scheduling,
- feasibility and blocker reporting.

This will eventually become the Execution & Feasibility page.

---

## What should NOT become its own page

Not every smart capability deserves a sidebar item.

The following should usually stay embedded inside the larger page where the decision is being made:

- internal talent readiness,
- learning-pathway coverage,
- role-level recruiting feasibility,
- evidence warnings,
- constraint checks,
- scheduler diagnostics,
- role-skill bundle detail.

The rule is:

**Section -> Page -> Intelligence inside the page**

not:

**Every feature -> new sidebar item**

That keeps the navigation understandable even as the product gets smarter.

---

## Page responsibilities

### Planning Overview

Keep this intentionally small.

It should answer things like:

- What is the current workforce plan?
- What changed versus Baseline?
- Where are the biggest demand shifts?
- What response is currently approved?
- What is the biggest execution risk?
- Is the plan currently feasible?

It should link into the detailed planning pages instead of duplicating all of their controls.

### Scenario Modeling

Owns:

- enterprise planning assumptions,
- Baseline vs custom scenarios,
- BU what-if scenarios,
- saved scenario comparison,
- headcount / FTE / labor-cost trajectory modeling.

### Position & Workforce Design

Owns:

- position inventory,
- position actions,
- structural role changes,
- BU / level / job-profile scoping,
- role-demand decomposition,
- recruiting-demand impact,
- skill-demand impact.

### Workforce Response

Owns:

- Build / Move / Buy allocation,
- role response planning,
- internal readiness,
- development feasibility,
- external recruiting evidence,
- multi-role response portfolios,
- BU destination ownership.

### Execution & Feasibility

Owns:

- monthly execution schedules,
- approved capacity timing,
- constraint checks,
- deadline coverage,
- auto-scheduling,
- infeasibility / blocker reporting.

### Workforce Forecasting

Future page.

This should eventually handle predictive demand rather than deterministic scenario assumptions alone, including:

- headcount forecasting,
- attrition forecasting,
- hiring-demand forecasting,
- vacancy / capacity risk,
- confidence ranges,
- model accuracy and backtesting.

### Labor Cost Planning

Owns workforce-cost planning rather than generic finance.

Eventually this should include:

- labor-cost scenarios,
- vacancy cost,
- salary / inflation assumptions,
- plan vs budget,
- cost of workforce-response options when defensible cost data exists.

---

## Navigation principles

### Keep filters page-specific

Most filters should belong to the page they affect.

Avoid one giant universal filter panel unless the filter truly has a cross-product meaning.

Examples:

- Attrition can have attrition-specific filters.
- Skills can have job-family / skill filters.
- Workforce Planning can have scenario / BU / position filters.
- Survey can have survey-cycle / population filters.

### Keep the global AI global

The AI panel can stay available across pages, but its tools and suggested questions should respond to the active context.

The assistant should be able to cross domains when the question requires it, while still using governed tools for the calculations.

### Preserve deterministic math

LLMs can:

- understand the user's question,
- choose the right governed tool,
- explain results,
- compare options,
- summarize tradeoffs.

LLMs should not silently replace deterministic workforce calculations with generated numbers.

---

## Current product -> future architecture

### Already live today

- Overview
- Workforce
- Attrition
- Talent Acquisition
- Survey & Sentiment
- Labor Cost
- Skills
- Workforce Planning
- cross-page AI panel

### Current Workforce Planning intelligence already built

- enterprise deterministic scenarios,
- BU what-if scenarios,
- position modeling,
- structural position actions,
- recruiting-demand linkage,
- skill-demand linkage,
- Build / Move / Buy evidence,
- internal talent readiness,
- development-pathway coverage,
- role-level recruiting feasibility,
- role response planning,
- multi-role response portfolio,
- BU demand ownership,
- BU response allocation,
- time-phased execution,
- hard-constraint feasibility,
- constraint-aware auto-scheduling.

### Planned navigation migration

Do not move everything at once.

Recommended sequence:

1. keep the current four-step Workforce Planning workflow stable,
2. continue extracting the giant planning component into smaller code components,
3. create a small Planning Overview,
4. promote Scenario Modeling, Position & Workforce Design, Workforce Response, and Execution & Feasibility into dedicated pages,
5. move Labor Cost into Workforce Strategy & Planning as Labor Cost Planning,
6. expand Talent Management only as the underlying capabilities are ready,
7. group the sidebar under the three major sections once enough destination pages exist.

The current four-step experience is therefore not throwaway work. It is the bridge to the final page structure.

---

## Simple way to explain the product

A casual explanation:

> I started with the analytics layer, but I didn't want the product to stop at telling someone what happened. I wanted it to help with the actual workforce decision.
>
> So the planning side follows a pretty simple flow: first figure out what workforce you think you'll need, then translate that into actual position changes, decide whether to Build, Move, or Buy the talent, and finally check whether the plan is realistic to execute.
>
> The AI helps across the process, but I kept the calculations deterministic so it isn't just making up workforce numbers.

A shorter version:

> It goes from workforce analytics into actual workforce planning — understand the workforce, model the future, design the roles, decide how to close the gaps, and test whether the plan is executable.
