# Changelog

Repository-level changes (installer, templates, docs, CI). Each module keeps
its own changelog in `modules/<id>/CHANGELOG.md`.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and this project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-10-10

### Added

- Central CLI `scripts/setup.sh` with `list`, `info`, `validate`, `test`,
  `install`, `update`, `uninstall`, `status` and `new`; `--dry-run`,
  `--force` and `--json` options; checksum-based install records.
- Module manifest schema v1 with strict validation.
- `scripts/validate-repo.sh`: manifests, links, `bash -n`, ShellCheck,
  markdownlint and unit tests.
- Templates for modules, agents, skills and workflows.
- Initial modules, all 0.1.0 and experimental: `harness-engineering`,
  `daily-automation`, `ecommerce-automation`, `seo-automation`,
  `claude-code-toolkit`.
- MIT license.
- CI workflows, issue and pull request templates, Dependabot configuration.
- Documentation: architecture, installation, module development, manifest
  reference, security, troubleshooting, FAQ and decision records.
