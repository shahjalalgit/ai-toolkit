---
name: conventional-commit
description: Draft a Conventional Commits message for the currently staged changes. Use when the user asks for a commit message or to describe staged changes. Does not create the commit.
---

# Conventional commit message

1. Run `git diff --staged --stat` and `git diff --staged`. If nothing is
   staged, say so and stop. Do not stage files yourself.
2. Run `git log --oneline -10` to match the repository's existing style
   (scopes, capitalisation, ticket references).
3. Write one message:

   ```text
   <type>(<optional scope>): <imperative summary, max 72 chars>

   <body: what changed and why, wrapped at 72 chars>

   <footer: BREAKING CHANGE: ..., Refs: TICKET-123>
   ```

   Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`,
   `chore`, `revert`. Use `!` after the type and a `BREAKING CHANGE:` footer
   for incompatible changes.
4. If the staged changes mix unrelated concerns, suggest splitting the commit
   and show which files belong together.

Output the message in a code block. Only run `git commit` if the user
explicitly asks.
