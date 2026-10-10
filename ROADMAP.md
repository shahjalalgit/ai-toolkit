# Roadmap

Status as of 2026-10-10. Items move from Planned to In progress only when
someone is working on them, and to Implemented only when merged with tests.

## Implemented (0.1.0)

- Central installer with dry run, ownership tracking, update and uninstall.
- Strict manifest schema v1 and repository validation script.
- Module, agent, skill and workflow templates; `new` scaffolding command.
- harness-engineering: ticket gate, OpenAPI breaking-change gate, two
  subagents, gated workflow skill.
- daily-automation: daily summary CLI, scheduler wrapper, launchd example.
- ecommerce-automation: catalog and inventory validator (JSON).
- seo-automation: page, robots.txt, sitemap and content heuristic checks.
- claude-code-toolkit: two skills, two subagents, three hooks, CLAUDE.md
  template.
- CI on Ubuntu (Node 22, 24) and macOS (Node 24).
- MIT license.

## In progress

- Nothing yet. First goal: publish the repository and get CI green on GitHub.

## Planned

Not started; order is a rough priority, not a commitment.

- seo-automation: optional fetching of live URLs (opt-in network permission),
  following sitemap indexes, hreflang checks.
- ecommerce-automation: CSV input; Google Merchant Center feed rules.
- harness-engineering: YAML OpenAPI input; enforce the fix-loop limit with a
  hook instead of instructions; GitHub Actions example workflow file.
- daily-automation: read tasks from GitHub Issues (read-only, explicit token).
- Installer: `diff` command showing local edits to installed files.
- Promote modules to Stable once their CLIs and outputs settle.
