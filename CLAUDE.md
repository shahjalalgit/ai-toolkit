# Claude Code instructions

@AGENTS.md

## Claude Code specifics

- Claude Code assets live in modules, not in this repository's own `.claude/`
  directory: `modules/*/claude/{skills,agents,hooks}`. Follow the formats in
  `templates/skill-template/` and `templates/agent-template/`; check
  <https://code.claude.com/docs> before using a frontmatter field or hook event
  not already used here.
- To try a module's Claude Code assets, install into a scratch project:
  `./scripts/setup.sh install claude-code-toolkit --target "$(mktemp -d)"`.
