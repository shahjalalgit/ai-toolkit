# 0001: Modular monorepo with independent modules

- Status: Accepted
- Date: 2026-10-10

## Context

The toolkit covers unrelated domains (SDLC gates, SEO, e-commerce data,
Claude Code assets) that share conventions, CI and an installer, but not code.
Users often want only one automation.

## Decision

One repository with a root `modules/` directory. Each module is
self-contained, has its own manifest, version and changelog, and does not
import other modules. No build system or workspace tooling.

## Consequences

- One place for templates, CI, docs and the installer.
- Modules can be copied out and used standalone.
- Small amounts of duplication (argument parsing, output formatting) are
  accepted in exchange for independence.
- If shared code becomes necessary, it should be a separately versioned
  `library` module, not cross-imports.
