# Contributing to AI Toolkit

Thanks for helping. This guide covers how to set up, what a good change looks
like, and how releases work.

## Ground rules

- Be kind and constructive. See the [Code of Conduct](CODE_OF_CONDUCT.md).
- Report security issues privately. See [SECURITY.md](SECURITY.md).
- Document what exists. Never describe planned work as implemented.
- Never commit secrets, real customer data or machine-specific paths.

## Development setup

```bash
git clone <repo-url> ai-toolkit && cd ai-toolkit
npm ci                         # installs the pinned markdownlint only
brew install shellcheck        # optional locally, required in CI
./scripts/validate-repo.sh     # must pass before you open a PR
```

Requirements: Node.js 22+, bash 3.2+, jq (for Claude Code hook tests).

## Making a change

1. Open an issue first for new modules (use the "New automation / module
   proposal" template) or large changes.
2. Create a branch: `feat/<module>-<topic>`, `fix/<module>-<topic>` or
   `docs/<topic>`.
3. Keep changes focused on one module or one repository concern.
4. Add or update tests. Bug fixes need a test that fails without the fix.
5. Update the module `README.md` and `CHANGELOG.md` (under `[Unreleased]`),
   and the root `CHANGELOG.md` for repository-level changes.
6. Run `npm run validate`.
7. Open a pull request and complete the checklist.

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
with the module id as scope:

```text
feat(seo-automation): check hreflang alternate links
fix(installer): reject targets inside the modules directory
docs: clarify standalone installation
```

## Code standards

- **Shell:** `#!/usr/bin/env bash`, `set -euo pipefail` for scripts (hooks may
  use `set -uo pipefail` to control exit codes), quote every expansion,
  bash 3.2 compatible (no associative arrays, `mapfile` or `${var,,}`), clean
  under ShellCheck.
- **Node:** ES modules (`.mjs`), Node 22+, standard library only unless a
  dependency is clearly justified in the PR. Put logic in pure exported
  functions and keep the CLI wrapper thin.
- **Exit codes:** `0` success, `1` check failed, `2` usage or I/O error.
- **Tests:** `node:test`, local fixtures, temporary directories. No network.
- **Docs:** markdownlint clean, relative links that resolve.

## Module requirements

New modules must pass `./scripts/setup.sh validate <id>` and follow
[docs/module-development.md](docs/module-development.md). In review we check:

- Clear purpose and honest status table.
- Least-privilege `permissions`; every side effect documented.
- No automatic external effects (messages, notifications, schedules, writes
  to third-party systems) without explicit opt-in and confirmation.
- Deterministic tests that run offline.

## Versioning and releases

Both the repository and each module follow [Semantic Versioning](https://semver.org/):

| Change | Bump |
| --- | --- |
| Removed or renamed command, flag, manifest field, output field; changed exit codes | **major** |
| New command, check, flag or module; backwards-compatible output additions | **minor** |
| Bug fixes, docs, internal refactors without behaviour change | **patch** |

While a version is `0.x`, minor bumps may include breaking changes; call them
out under a **Breaking** note in the changelog.

Release steps (maintainers):

1. Move `[Unreleased]` entries to a new version heading in the affected
   changelogs; bump `module.json` and/or `package.json` versions.
2. Run `npm run validate`.
3. Tag the repository `vX.Y.Z` for repository releases. Module versions are
   tracked in their manifests and changelogs.
4. Publish a GitHub release with the changelog excerpt.

## License

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE).
