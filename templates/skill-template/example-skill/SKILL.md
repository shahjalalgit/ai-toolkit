---
name: example-skill
description: <What this skill does and when to use it, in one or two sentences. Include words a user would naturally say.>
disable-model-invocation: true
---

# <Skill title>

<One sentence describing the outcome.>

Input: `$ARGUMENTS` (<what the user passes, e.g. a file path>).

## Steps

1. <Gather context: which files to read, which read-only commands to run.>
2. <Do the work.>
3. <Verify: which command proves it worked.>

## Rules

- Ask before any destructive or externally visible action.
- Do not commit, push or send messages unless the user asks.
