# Interview Grill Scoring Rubric (MVP)

This rubric is designed for fast, consistent scoring of interview answers.

## Overview

- Score range: 0-4 per dimension (integer)
- Default dimensions (5): Structure, Correctness, Tradeoffs, Metrics, Risks
- Total: 0-20

## Scoring scale (0-4)

Use the same meaning across all dimensions.

- 4 (Excellent): clear, complete, accurate; anticipates follow-ups; demonstrates senior judgment.
- 3 (Good): mostly complete and correct; minor gaps; good prioritization.
- 2 (Okay): partially correct; missing key pieces; some hand-waving.
- 1 (Weak): confused, shallow, or largely incomplete; wrong priorities.
- 0 (No signal): did not address; purely speculative; or fundamentally incorrect.

## Dimension 1: Structure

Measures: clarity, ordering, communication under pressure.

What to look for:
- states assumptions and scope
- provides a plan (high-level steps)
- uses a consistent framework (problem -> approach -> details -> validation)
- summarizes decision and next actions

Anchors:
- 4: crisp outline; navigates tradeoffs; responds without losing the thread; tight summary.
- 3: clear flow; minor rambling; reasonable scoping.
- 2: some structure but jumps around; unclear assumptions.
- 1: disorganized; interviewer must pull answers out.
- 0: no coherent answer.

## Dimension 2: Correctness

Measures: technical correctness for the core problem.

What to look for:
- correct concepts and terminology
- handles relevant edge cases
- avoids major factual errors

Anchors:
- 4: correct end-to-end; validates with examples/edge cases.
- 3: correct core; small inaccuracies that don’t change the solution.
- 2: partly correct; misses an important constraint.
- 1: major errors.
- 0: pure guess.

## Dimension 3: Tradeoffs

Measures: ability to compare options and choose appropriately.

What to look for:
- considers at least 2 viable approaches
- identifies constraints (latency/throughput/consistency/cost/dev time)
- chooses and justifies based on requirements

Anchors:
- 4: multiple options; nuanced evaluation; clear rationale and fallback.
- 3: mentions alternatives and tradeoffs; reasonable choice.
- 2: names tradeoffs but shallow.
- 1: one-track solution; ignores constraints.
- 0: no comparison.

## Dimension 4: Metrics

Measures: verification mindset and measurable success criteria.

What to look for:
- defines success metrics (SLO/SLI, p95 latency, error rate, cost)
- proposes measurement/monitoring
- includes acceptance criteria and rollback signals

Anchors:
- 4: specific metrics with targets; measurement plan.
- 3: good set of metrics; targets partially missing.
- 2: generic metrics; lacks targets or measurement detail.
- 1: minimal metrics.
- 0: no metrics.

## Dimension 5: Risks

Measures: ability to foresee failure modes and mitigate.

What to look for:
- identifies key failure modes (correctness/scaling/security/privacy/reliability)
- mitigations: tests, rate limits, backpressure, retries, circuit breakers, audits
- explicitly calls out unknowns

Anchors:
- 4: prioritizes top risks; concrete mitigations; de-risk plan.
- 3: good risk list; mitigations partially detailed.
- 2: some risks; mitigations vague.
- 1: misses obvious risks.
- 0: no risk thinking.

## Role-level adjustments (MVP)

Adjust expectations, not the rubric.

- Junior: reward correctness and basic structure; fewer tradeoffs/ops expectations.
- Mid: expect tradeoffs, testing, and reasonable metrics.
- Senior/Staff: expect strong scoping, deep tradeoffs, clear metrics, operational and organizational risks.

## How to apply (quick procedure)

1) Write 2-5 bullet notes from the answer (facts only).
2) Score each dimension 0-4 using anchors.
3) Provide one sentence justification per dimension.
4) Provide top 1-3 improvement actions.

## Common pitfalls

- Don’t over-score eloquence.
- Don’t penalize missing details if the candidate scoped them out explicitly.
- If requirements are ambiguous, reward clarifying questions.

## Optional bonus tags (do not add to score)

- clarifying-questions
- examples
- operational-maturity
- security-awareness
- product-sense
- ownership
