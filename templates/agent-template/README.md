# Agent template

Template for a Claude Code subagent: a Markdown file with YAML frontmatter,
stored in `.claude/agents/<name>.md` (project) or `~/.claude/agents/` (personal).

## Use it

1. Copy [agent.md](agent.md) into a module, for example
   `modules/<module>/claude/agents/<agent-name>.md`.
2. Replace every `<placeholder>`. `name` must match the file name.
3. Give the agent the fewest tools it needs. Omitting `tools` grants all
   tools, so always set it.
4. Add the file to the module's `install.files` in `module.json` with target
   `.claude/agents`, and describe it in the module README.

## Frontmatter fields used here

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | lowercase, hyphens; matches the file name |
| `description` | yes | when Claude should delegate to this agent; be specific |
| `tools` | no | comma-separated, e.g. `Read, Grep, Glob`; omit = all tools |
| `model` | no | `sonnet`, `opus`, `haiku`, `inherit` or a full model id |

Other fields exist; see the Claude Code sub-agents documentation at
<https://code.claude.com/docs/en/sub-agents> before adding them.

Examples in this repository:
[security-reviewer](../../modules/claude-code-toolkit/claude/agents/security-reviewer.md),
[independent-reviewer](../../modules/harness-engineering/claude/agents/independent-reviewer.md).
