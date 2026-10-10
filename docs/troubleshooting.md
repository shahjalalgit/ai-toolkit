# Troubleshooting

Module-specific problems are covered in each module README's Troubleshooting
section.

## Installer

| Message | Cause and fix |
| --- | --- |
| `Node.js >= 22 is required` | Install Node 22+ (`brew install node`) or switch with your version manager. |
| `unknown module "x"` | Check the id with `./scripts/setup.sh list`. Ids are kebab-case. |
| `invalid module id` | Use the module id, not a path: `seo-automation`, not `modules/seo-automation`. |
| `--target <dir> is required` | The installer never guesses a destination. Pass `--target /path/to/project`. |
| `target directory does not exist` | Create it first; the installer does not create the target. |
| `refusing to install into the toolkit modules directory` | Pick a project directory outside `modules/`. |
| `has an invalid manifest` | Run `./scripts/setup.sh validate <id>` for the list of problems. |
| `skip ... (exists with different content)` | You have a different file at that path. Compare, then rerun with `--force` if you want the toolkit's version. |
| `path escapes the target via a symlink` | A directory in the target is a symlink to somewhere else. Replace it with a real directory or install elsewhere. |
| `install state ... is corrupt` | Inspect `.ai-toolkit/state/<id>.json`. Delete it to reset (files then count as unowned). |
| `is not installed` | `update`/`uninstall` need a previous `install` in that target. |

## Validation

| Problem | Fix |
| --- | --- |
| `shellcheck not found; skipping` | Optional locally: `brew install shellcheck`. CI requires it. |
| `markdownlint-cli2 not found; skipping` | Run `npm ci`. |
| `README.md is missing a "## X" section` | Add the heading; see [module-development.md](module-development.md#4-readme-sections). |
| `broken link` / `missing anchor` | Fix the relative path or heading text. Anchors are lowercase with spaces as `-`. |
| Tests pass locally but fail in CI | CI runs Node 22 and 24 on Linux, and Node 24 on macOS. Check for platform-specific commands (GNU vs BSD `sed`, `date`). |

## Claude Code assets

| Problem | Fix |
| --- | --- |
| Skill or agent not available | Check the path (`.claude/skills/<name>/SKILL.md`, `.claude/agents/<name>.md`) and restart Claude Code. |
| Hooks do nothing | Hooks must be added to `.claude/settings.json` or `.claude/settings.local.json`; the installer only copies scripts. Check with `/hooks`. |
| Hook reports `jq not found` | Install `jq`. Until then the safety hooks do not block anything. |
