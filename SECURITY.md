# Security Policy

## Supported versions

| Version | Supported |
| --- | --- |
| `main` branch and latest module versions | Yes |
| Anything older | No |

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Use GitHub private vulnerability reporting on this repository
(**Security** tab > **Report a vulnerability**). If that option is not
available, contact the maintainer ([@shahjalalgit](https://github.com/shahjalalgit))
privately through their GitHub profile and include:

- The affected module or script and version (commit hash).
- Steps to reproduce, with a minimal fixture if possible.
- Impact: what an attacker could read, write or execute.

What to expect: an acknowledgement within 7 days, an assessment and plan
within 30 days, and credit in the changelog unless you prefer otherwise.
This is a personal project maintained on a best-effort basis; there is no
bug bounty.

## Scope

In scope: the installer (`scripts/`), manifest validation, module code, and
Claude Code hooks/skills/agents shipped in this repository. Examples:

- An install path that writes outside the target directory.
- A manifest that causes code execution during install or validation.
- A hook that can be bypassed in a way the documentation says it prevents.

Out of scope: limitations already documented in a module's Limitations
section (for example, the pattern-based hooks are not a sandbox), and issues
in third-party tools.

## Security practices in this repository

- Manifests are data; nothing from a manifest is executed.
- No module makes network calls or sends data to third parties.
- No real credentials, tokens or customer data in the repository; `.env`
  files are git-ignored. Sample data is synthetic.
- Installers never overwrite files silently and support `--dry-run`.

Full threat model and guidance for module authors:
[docs/security.md](docs/security.md).
