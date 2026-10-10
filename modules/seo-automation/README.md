# SEO Automation

Technical SEO and AI-search (AEO/GEO) checks for local HTML, robots.txt and
sitemap files. Zero dependencies, deterministic output, CI-friendly exit codes.

## Purpose

Catch common, objective SEO defects before they ship and surface content
structure signals that help answer engines extract and attribute content.

Supported use cases:

- Pre-deploy checks on a static site build (`dist/`, `public/`).
- Validating a generated `sitemap.xml` or `robots.txt` in CI.
- Giving Claude Code a factual baseline before it writes SEO recommendations
  (see the `seo-page-review` skill).

## Status

**Experimental (0.1.0).** All four commands are implemented and tested against
the bundled examples. The HTML extraction is regex-based, not a full parser.

| Capability | Status |
| --- | --- |
| Page metadata, canonical, robots meta, lang, viewport, H1, `alt` | Implemented |
| JSON-LD syntax and common required properties | Implemented |
| robots.txt and sitemap validation | Implemented |
| AEO/GEO content heuristics | Implemented (heuristic) |
| Fetching live URLs | Not implemented |
| Lighthouse / Core Web Vitals | Not implemented (use Lighthouse) |

### Deterministic checks vs. recommendations

Every finding is labelled with a `kind`:

- `check`: objective rule (e.g. invalid JSON-LD, relative canonical URL).
- `guideline`: widely used convention, not a search-engine rule (e.g. title
  length).
- `heuristic`: content-structure signal for answer engines. Subjective.

The CLI never generates AI text. AI recommendations come only from the optional
Claude Code skill, which must label them as subjective. **No tool can guarantee
rankings or AI search citations, and this one does not claim to.**

## Prerequisites

- Node.js 22 or later. No npm packages.

## Installation

Standalone (no toolkit needed): copy `modules/seo-automation/` anywhere and run
`node src/cli.mjs`.

Into a project with the central installer:

```bash
./scripts/setup.sh install seo-automation --target ~/code/my-site --dry-run
./scripts/setup.sh install seo-automation --target ~/code/my-site
```

This copies `src/` to `.ai-toolkit/modules/seo-automation/src/` and the skill
to `.claude/skills/seo-page-review/` in the target project.

## Usage

Run these from `modules/seo-automation/`:

```bash
node src/cli.mjs page examples/good-page.html --url https://www.example.com/guides/validate-sitemap
node src/cli.mjs page examples/bad-page.html --json
node src/cli.mjs robots examples/robots.txt
node src/cli.mjs sitemap examples/sitemap.xml --base-url https://www.example.com
node src/cli.mjs content examples/good-page.html
```

Check every page of a static build:

```bash
find dist -name '*.html' -print0 | xargs -0 -n1 node src/cli.mjs page
```

In Claude Code (after installing): ask "review `dist/index.html` for SEO" or
run `/seo-page-review dist/index.html`.

## Inputs and outputs

| Command | Input | Output |
| --- | --- | --- |
| `page <file> [--url U]` | HTML file | Findings |
| `robots <file>` | robots.txt | Findings |
| `sitemap <file> [--base-url U]` | sitemap XML | Findings |
| `content <file>` | HTML file | Heuristic findings |

Text output by default; `--json` prints `{command, file, findings[]}` where each
finding is `{level, kind, rule, message}`.

Exit codes: `0` no error-level findings, `1` at least one error, `2` usage or
read error.

## Permissions and side effects

- Reads the files you pass. Writes nothing. No network access.
- The Claude Code skill runs the CLI through Bash and reads the page; it does not
  edit files unless you ask.

## Testing

```bash
./scripts/setup.sh test seo-automation
# or, from the module directory:
node --test tests/*.test.mjs
```

## Uninstall

```bash
./scripts/setup.sh uninstall seo-automation --target ~/code/my-site
```

Only files unchanged since installation are removed. Standalone copies can be
deleted directly.

## Limitations

- Regex-based HTML extraction: malformed markup or tags inside unusual
  contexts can cause false findings.
- JSON-LD checks cover syntax, `@context`, `@type` and a small set of commonly
  required properties for common types; they are not a replacement for
  Google's Rich Results Test or the Schema.org validator.
- `robots.txt` group parsing follows RFC 9309 basics; wildcard path matching is
  not evaluated.
- Sitemap checks do not follow child sitemaps in an index or read `.gz` files.
- Length thresholds are conventions, not rules.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Exit code 2, `cannot read` | Check the file path; the CLI only reads local files. |
| `structured-data-invalid-json` but JSON looks fine | Look for trailing commas or HTML comments inside the `<script>` block. |
| False `img-alt-missing` | `alt=""` is accepted; the attribute must exist. |
| Need live pages | Save them first: `curl -sSL https://example.com -o page.html`. |

## Compatibility

- Node.js 22+ on macOS and Linux. Manifest: `module.json` (schema v1).
