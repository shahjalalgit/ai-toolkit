# Claude Code Toolkit

Reusable, portable Claude Code building blocks: skills, subagents, hooks and a
project instructions template. Everything is plain files you can read before
installing.

## Purpose

Give every project the same baseline Claude Code setup without copying files
by hand:

| Asset | Kind | What it does |
| --- | --- | --- |
| `conventional-commit` | Skill | Drafts a Conventional Commits message for staged changes. Never commits. |
| `changelog-entry` | Skill (manual) | Adds a Keep a Changelog entry under `[Unreleased]`. Invoke with `/changelog-entry`. |
| `security-reviewer` | Subagent | Read-only security review (tools: Read, Grep, Glob). |
| `docs-writer` | Subagent | Updates Markdown docs to match the code. |
| `block-dangerous-bash.sh` | PreToolUse hook | Blocks `rm -rf /`-style deletes, `curl \| sh`, force-push to main, disk writes. |
| `protect-secret-files.sh` | PreToolUse hook | Blocks reading/editing `.env`, keys, credentials (allows `.env.example`). |
| `notify-macos.sh` | Notification hook | Local macOS notification when Claude needs you. |
| `templates/CLAUDE.md` | Template | Project instructions skeleton. |
| `config/settings.example.json` | Example | Hook wiring to merge into `.claude/settings.json`. |

## Status

**Experimental (0.1.0).** All assets exist and the hooks are covered by
automated tests. Skills and subagents were written against the Claude Code
2.1.x documentation (code.claude.com/docs); their behaviour depends on the
model and is not covered by automated tests beyond frontmatter checks.

## Prerequisites

- Claude Code 2.x.
- `jq` for the hooks (`/usr/bin/jq` ships with recent macOS; otherwise
  `brew install jq`).
- bash 3.2+.

## Installation

```bash
./scripts/setup.sh install claude-code-toolkit --target ~/code/my-app --dry-run
./scripts/setup.sh install claude-code-toolkit --target ~/code/my-app
```

Installed into the target project:

```text
.claude/skills/conventional-commit/SKILL.md
.claude/skills/changelog-entry/SKILL.md
.claude/agents/security-reviewer.md
.claude/agents/docs-writer.md
.claude/hooks/block-dangerous-bash.sh
.claude/hooks/protect-secret-files.sh
.claude/hooks/notify-macos.sh
.ai-toolkit/modules/claude-code-toolkit/config/settings.example.json
.ai-toolkit/modules/claude-code-toolkit/templates/CLAUDE.md
```

### Enabling the hooks (manual step)

The installer **never edits `.claude/settings.json`**, because that file is
yours and may hold other settings. Hooks are inert until you wire them up:

1. Open `.ai-toolkit/modules/claude-code-toolkit/config/settings.example.json`.
2. Merge its `hooks` object into `.claude/settings.json` (shared with the
   team) or `.claude/settings.local.json` (just you). Leave out hooks you do
   not want, for example `Notification` on Linux.
3. Restart Claude Code and run `/hooks` to confirm they are registered.

### Standalone / personal installation

Copy individual files without the toolkit:

```bash
cp -R modules/claude-code-toolkit/claude/skills/conventional-commit ~/.claude/skills/
cp modules/claude-code-toolkit/claude/agents/security-reviewer.md ~/.claude/agents/
```

Files in `~/.claude/` apply to all your projects. Do not install into your
home directory with `--target ~` unless you want that.

## Usage

Skills:

```text
> write a commit message for what I staged       (Claude may pick conventional-commit)
> /conventional-commit                          (explicit)
> /changelog-entry Added CSV export to reports   (manual-only skill)
```

Subagents:

```text
> use the security-reviewer agent on src/auth/
> have docs-writer update the README for the new --json flag
```

Hooks run automatically once enabled. To check a hook by hand:

```bash
echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' \
  | .claude/hooks/block-dangerous-bash.sh; echo "exit=$?"   # exit=2
```

Project instructions: copy the template to the project root and fill it in.

```bash
cp .ai-toolkit/modules/claude-code-toolkit/templates/CLAUDE.md ./CLAUDE.md
```

### Workflow integration example

A typical review flow combining the pieces:

1. Make changes; stage them.
2. Ask Claude to "use security-reviewer on the staged diff".
3. `/conventional-commit` to draft the message; you run `git commit`.
4. `/changelog-entry` to record user-facing changes.
5. While Claude works, `notify-macos` tells you when it is waiting for
   permission or input.

## Inputs and outputs

| Hook | Reads (stdin JSON) | Result |
| --- | --- | --- |
| `block-dangerous-bash.sh` | `tool_input.command` | exit 0 allow, exit 2 block (reason on stderr goes to Claude) |
| `protect-secret-files.sh` | `tool_input.file_path` | exit 0 allow, exit 2 block |
| `notify-macos.sh` | `message` | Desktop notification via `osascript`; always exit 0 |

All hooks exit 1 (a non-blocking error shown to you) if `jq` is missing or
the input cannot be parsed. **This means the safety hooks fail open**: Claude
Code continues the action. Install `jq` before relying on them.

## Permissions and side effects

- Skills and subagents act through Claude Code's normal permission system.
  `security-reviewer` has read-only tools; `docs-writer` can edit files.
- The hooks only read stdin; `notify-macos.sh` additionally runs `osascript`
  to show a local notification. Nothing is sent over the network.
- Installation writes into `.claude/` of the target project. Review the files
  before committing them to a shared repository.

## Testing

```bash
./scripts/setup.sh test claude-code-toolkit
```

Tests feed sample hook payloads to each script and check exit codes, verify
the settings example only references shipped hooks, and check skill/agent
frontmatter.

## Uninstall

```bash
./scripts/setup.sh uninstall claude-code-toolkit --target ~/code/my-app
```

Then remove the hook entries you merged into `.claude/settings*.json`; the
uninstaller does not touch settings files.

## Limitations

- Pattern-based hooks are guardrails against accidents, not a sandbox.
  Commands built with variables, `eval`, aliases or scripts can bypass them.
  Use Claude Code permission rules and sandboxing for hard limits.
- `protect-secret-files` matches by file name only. Secrets in other files
  are not detected, and the Bash tool can still `cat .env`.
- Skill and agent quality depends on the model; they are prompts, not code.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Hooks never fire | Check `/hooks` in Claude Code; make sure the JSON was merged into the right settings file and the scripts are executable (`chmod +x .claude/hooks/*.sh`). |
| "jq not found" in the transcript | Install jq; the hooks fail open without it. |
| No macOS notification | Allow notifications for "Script Editor" in System Settings > Notifications. |
| Skill not listed | Check the path is `.claude/skills/<name>/SKILL.md` and restart Claude Code. |

## Compatibility

- Claude Code 2.x (written against 2.1.x docs), macOS and Linux.
- Hook payload fields used: `tool_input.command`, `tool_input.file_path`,
  `message`. Manifest: `module.json` (schema v1).
