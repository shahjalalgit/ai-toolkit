# Skill template

Template for a Claude Code skill: a directory containing `SKILL.md`, stored at
`.claude/skills/<name>/` (project) or `~/.claude/skills/<name>/` (personal). A
skill can be invoked by you as `/<name> [arguments]`, and by Claude when the
description matches the task (unless `disable-model-invocation: true`).

## Use it

1. Copy [example-skill/](example-skill/) to
   `modules/<module>/claude/skills/<skill-name>/`.
2. Rename `name` in the frontmatter to match the directory name.
3. Write a specific `description`; Claude uses it to decide when to load the
   skill.
4. Set `disable-model-invocation: true` for skills with side effects
   (commits, deploys, edits) so they only run when you invoke them.
5. Add the directory to the module's `install.files` with target
   `.claude/skills/<skill-name>`.

`$ARGUMENTS` in the body is replaced with whatever follows `/<name>`.

Field reference: <https://code.claude.com/docs/en/skills>. Examples:
[conventional-commit](../../modules/claude-code-toolkit/claude/skills/conventional-commit/SKILL.md),
[harness-workflow](../../modules/harness-engineering/claude/skills/harness-workflow/SKILL.md).
