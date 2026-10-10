# Changelog: SEO Automation

All notable changes to this module are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the module uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-10-10

### Added

- `page` command: title, meta description, canonical, meta robots, `lang`,
  viewport, H1, image `alt`, render-blocking scripts, HTML size and JSON-LD
  checks.
- `robots` command: robots.txt parsing, block-all detection, sitemap
  directives and AI crawler group reporting.
- `sitemap` command: urlset and sitemap index validation (absolute URLs,
  duplicates, `lastmod` format, protocol limits, host consistency).
- `content` command: labelled AEO/GEO content-structure heuristics.
- `seo-page-review` Claude Code skill.
