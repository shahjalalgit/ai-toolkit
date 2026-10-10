---
name: harness-workflow
description: Run a ticket through a gated, human-supervised development workflow - validate requirements, check API contracts, plan, implement, test with a bounded fix loop, independent review, and completion checklist.
disable-model-invocation: true
---

# Harness workflow

Run the ticket given in `$ARGUMENTS` (a Markdown file path) through the gates
below **in order**. Do not skip a gate. Stop at every **CHECKPOINT** and wait
for the user's explicit approval before continuing.

The harness CLI lives at `.ai-toolkit/modules/harness-engineering/src/cli.mjs`
(installed) or `modules/harness-engineering/src/cli.mjs` (toolkit repo). Call
it `HARNESS` below.

## Gate 1: Requirements

1. Run `node HARNESS ticket <ticket.md>`.
2. If it exits non-zero, show the errors, propose fixes to the ticket, and stop.
3. Delegate to the `requirements-analyst` subagent for ambiguities.

**CHECKPOINT 1:** show the gate result and open questions. Wait for approval.

## Gate 2: Contracts (only if the change touches an API)

1. Identify the OpenAPI document (JSON). Save the base version, for example
   `git show main:openapi.json > /tmp/openapi-base.json`.
2. After designing the change, run
   `node HARNESS contract /tmp/openapi-base.json openapi.json`.
3. Breaking changes need explicit approval and a major version plan.

## Gate 3: Plan

Write a short plan: files to change, tests to add, and how each acceptance
criterion will be verified.

**CHECKPOINT 2:** wait for approval of the plan.

## Gate 4: Implement and test (bounded loop)

1. Implement the plan. Write or update tests first where practical.
2. Run the project's test command.
3. If tests fail, fix and re-run. **Maximum 3 fix attempts.** Count them out
   loud ("fix attempt 2 of 3").
4. After the third failed attempt, stop, summarise what you tried and what is
   still failing, and ask the user how to proceed. Do not weaken, skip or
   delete tests to make them pass.

## Gate 5: Independent review

Delegate to the `independent-reviewer` subagent with the ticket path. Address
CHANGES REQUESTED items through Gate 4 (the 3-attempt limit applies again).

## Gate 6: Completion

Fill in `.ai-toolkit/modules/harness-engineering/templates/completion-checklist.md`
(or the copy in the toolkit repo) in your reply, with evidence for every item.

**CHECKPOINT 3:** ask the user to approve completion. Do not commit, push or
open a pull request unless the user asks.
