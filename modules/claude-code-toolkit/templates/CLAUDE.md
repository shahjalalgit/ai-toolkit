# Project instructions for Claude Code

<!--
  Template from AI Toolkit (modules/claude-code-toolkit/templates/CLAUDE.md).
  Copy to the project root as CLAUDE.md and replace every <placeholder>.
  Keep it short: Claude loads this file into every session.
  If the project already has AGENTS.md, put shared rules there and import it
  here by adding `@AGENTS.md` on its own line, outside this comment.
-->

## Project

<One paragraph: what this project is, who uses it, main technologies.>

## Commands

- Install: `<npm ci>`
- Test: `<npm test>`
- Lint: `<npm run lint>`
- Run locally: `<npm run dev>`

## Conventions

- <Language/style rules that a linter does not enforce.>
- <Where new code goes, naming patterns, error handling approach.>
- Commit messages follow <Conventional Commits | project style>.

## Boundaries

- Never commit secrets. `.env` files are local only; use `.env.example` for placeholders.
- Ask before: deleting files, changing CI, adding dependencies, running migrations.
- Do not push, open pull requests or deploy unless asked.

## Verification

Before saying a task is done: run the test and lint commands above and report
the results. If something could not be verified, say so.
