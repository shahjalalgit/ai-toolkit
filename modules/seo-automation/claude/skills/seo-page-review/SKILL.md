---
name: seo-page-review
description: Review a local HTML page for technical SEO and answer-engine readiness. Runs the deterministic AI Toolkit SEO checks first, then adds clearly labelled AI recommendations. Use when the user asks for an SEO, metadata, structured data or AEO/GEO review of an HTML file.
---

# SEO page review

Use the AI Toolkit SEO CLI for facts and your own judgment only for recommendations.
Keep the two separate in the output.

## Steps

1. Locate the CLI. Try, in order:
   - `.ai-toolkit/modules/seo-automation/src/cli.mjs` (installed into this project)
   - `modules/seo-automation/src/cli.mjs` (inside the ai-toolkit repository)

   If neither exists, tell the user how to install the module and stop.
2. Run the deterministic checks on the file the user named, with JSON output:

   ```bash
   node <cli> page <file.html> --json
   node <cli> content <file.html> --json
   ```

   Add `--url <page-url>` to the `page` command if the user gave the public URL.
3. Report findings in a table grouped by level (error, warning, info). Keep each
   finding's `kind` (check, guideline, heuristic) visible.
4. Under a separate heading **AI recommendations (subjective)**, suggest concrete
   improvements, such as rewritten titles, descriptions or a direct-answer
   paragraph. Base them on the page content you read.

## Rules

- Do not fetch URLs or modify files unless the user asks.
- Never claim a change will improve rankings or guarantee AI search citations.
- If the CLI exits with code 2, show its error output instead of guessing.
