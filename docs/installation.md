# Installation

Modules can be used in two ways:

1. **Standalone**: copy a module folder (or individual files) and follow its
   README. No toolkit required.
2. **Central installer**: `scripts/setup.sh` copies a module's declared files
   into a project and tracks them so they can be updated or removed safely.

## Requirements

Node.js 22+ and bash 3.2+. The installer has no npm dependencies; `npm ci` is
only needed for repository development.

## Central installer

```text
./scripts/setup.sh <command> [args] [options]
```

| Command | Description |
| --- | --- |
| `list [--json]` | List modules with version and status |
| `info <module> [--json]` | Show runtime, permissions, entry points and installed paths |
| `validate [<module>]` | Validate manifests, required files and README sections |
| `test <module>` | Run the module's `node:test` suite |
| `install <module> --target DIR` | Copy the module's files into `DIR` |
| `update <module> --target DIR` | Refresh previously installed files |
| `uninstall <module> --target DIR` | Remove installed files that were not edited |
| `status --target DIR` | List modules installed in `DIR` |
| `new <module> --name NAME [--description TEXT]` | Scaffold a new module |

| Option | Applies to | Effect |
| --- | --- | --- |
| `--target DIR` | install, update, uninstall, status | Project directory. Must already exist. Required: there is no default. |
| `--dry-run` | install, update, uninstall, new | Print every action, write nothing |
| `--force` | install, update | Overwrite files that differ, including local edits |
| `--json` | list, info | Machine-readable output |

Aliases: `--list`, `--info <module>`, `--module <module>` (= `install`).
Shortcuts: `scripts/install-module.sh`, `scripts/update-module.sh`,
`scripts/new-module.sh`.

Exit codes: `0` success, `1` failure (unknown module, invalid manifest, unsafe
path, not installed), `2` usage error.

### What install does

1. Validates the module manifest. Invalid modules are never installed.
2. Validates the target: it must exist, be a directory, not be `/`, and not be
   inside the toolkit's `modules/` directory.
3. For each file declared in `install.files`, prints one action:

   | Action | Meaning |
   | --- | --- |
   | `create` | File did not exist; written |
   | `unchanged` | Already identical |
   | `update` | Replaced: it was installed by the toolkit and not edited since, or `--force` was given |
   | `skip` | Exists with different content that the toolkit does not own. Left alone. |
   | `orphaned` | (update) No longer shipped by the module; left in place |

4. Writes `.ai-toolkit/state/<module>.json` in the target with the version and
   a SHA-256 checksum of each file it owns.

Running `install` twice is safe: the second run reports everything as
`unchanged`.

Example:

```text
$ ./scripts/setup.sh install seo-automation --target ~/code/site
Installing seo-automation@0.1.0 into /Users/me/code/site
  create     .ai-toolkit/modules/seo-automation/src/checks.mjs
  create     .ai-toolkit/modules/seo-automation/src/cli.mjs
  create     .ai-toolkit/modules/seo-automation/src/html.mjs
  create     .claude/skills/seo-page-review/SKILL.md
Done: 4 created, 0 updated, 0 unchanged, 0 skipped.
Install record: .ai-toolkit/state/seo-automation.json
```

### Update

```bash
git pull                                   # get new module versions
./scripts/setup.sh update seo-automation --target ~/code/site --dry-run
./scripts/setup.sh update seo-automation --target ~/code/site
```

Files you edited after installing are reported as `skip` and kept. Use
`--force` only after reviewing them.

### Uninstall

```bash
./scripts/setup.sh uninstall seo-automation --target ~/code/site --dry-run
./scripts/setup.sh uninstall seo-automation --target ~/code/site
```

Removes files whose content still matches the install record, removes
directories that become empty, and deletes the install record. Edited files
are listed as `keep` and never deleted. Manual changes you made outside
installed files (for example hook entries merged into
`.claude/settings.json`) must be undone by hand; module READMEs list them.

### Should I commit installed files?

Commit `.claude/` assets if your team should share them. Whether to commit
`.ai-toolkit/` is your choice: committing it lets teammates run the vendored
CLIs and keeps install records consistent; ignoring it keeps the repository
smaller.

## Standalone use

Each module README has a "Standalone" note. In general:

```bash
cp -R modules/seo-automation ~/tools/seo-automation
node ~/tools/seo-automation/src/cli.mjs page index.html
```

For Claude Code assets, copy only the files you want into `.claude/` (project)
or `~/.claude/` (personal).

## What the installer will never do

- Execute anything from a manifest, or run `curl | bash`.
- Install packages globally or call a package manager.
- Write outside `--target`, follow symlinks out of it, or touch `.git/`.
- Edit shared configuration such as `.claude/settings.json`.
- Overwrite a file it does not own without `--force`.
