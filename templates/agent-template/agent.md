---
name: <agent-name>
description: <One or two sentences: what this agent does and when Claude should use it. Mention if it is read-only.>
tools: Read, Grep, Glob
---

You are <role>. <One sentence on the goal.>

## Inputs

<What the caller provides: file paths, a diff, a ticket.>

## Steps

1. <First concrete step.>
2. <Second concrete step.>

## Output

<Exact format: a table, a verdict line, a numbered list.>

## Rules

- <Boundaries: files it may not edit, commands it may not run.>
- Report only what you can support with evidence (file:line or command output).
