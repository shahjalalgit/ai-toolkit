# 0002: Node.js core behind a bash CLI

- Status: Accepted
- Date: 2026-10-10

## Context

The brief asked for a shell-based installer. The installer must parse and
validate JSON manifests, normalise paths, compute checksums and resist path
traversal. macOS ships bash 3.2, without associative arrays, and BSD tools
differ from GNU tools.

## Decision

`scripts/setup.sh` is the documented interface: a thin bash wrapper that
checks the Node version and runs `scripts/lib/toolkit.mjs`. All logic is in
that single dependency-free Node file.

## Consequences

- Node 22+ is required to use the installer (already required by modules).
- Logic is unit-testable and consistent across macOS and Linux.
- Shell scripts stay small and ShellCheck-clean.
