# Examples

Cross-module walkthroughs. Each module also has its own `examples/` folder
with sample inputs. All commands run from the repository root and only write
to temporary directories.

## Set up Claude Code in a new project

```bash
project="$(mktemp -d)"
./scripts/setup.sh install claude-code-toolkit --target "$project"
./scripts/setup.sh install harness-engineering --target "$project"
./scripts/setup.sh status --target "$project"
cp "$project/.ai-toolkit/modules/claude-code-toolkit/templates/CLAUDE.md" "$project/CLAUDE.md"
```

Then merge `.ai-toolkit/modules/claude-code-toolkit/config/settings.example.json`
into `$project/.claude/settings.json` to enable the hooks.

## Gate a ticket and an API change

```bash
H=modules/harness-engineering
node $H/src/cli.mjs ticket $H/examples/ticket-not-ready.md   # NOT READY, exit 1
node $H/src/cli.mjs ticket $H/examples/ticket-ready.md       # READY, exit 0
node $H/src/cli.mjs contract $H/examples/openapi-v1.json $H/examples/openapi-v2-breaking.json --json
```

## Check a static site before deploy

```bash
S=modules/seo-automation
for f in $S/examples/*.html; do
  echo "== $f"
  node $S/src/cli.mjs page "$f" || echo "(errors found)"
done
node $S/src/cli.mjs robots $S/examples/robots.txt
node $S/src/cli.mjs sitemap $S/examples/sitemap.xml --base-url https://www.example.com
```

## Validate product data and keep a report

```bash
E=modules/ecommerce-automation
out="$(mktemp -d)"
node $E/src/validate-catalog.mjs --catalog $E/examples/products.sample.json \
  --inventory $E/examples/inventory.sample.json --json > "$out/report.json" || true
jq '.findings | group_by(.rule) | map({rule: .[0].rule, count: length})' "$out/report.json"
```

## Daily summary into an archive folder

```bash
archive="$(mktemp -d)"
modules/daily-automation/scripts/run-daily-summary.sh modules/daily-automation/examples/tasks.json "$archive"
ls "$archive"
```

## Create a new module

See [docs/guides/creating-a-module.md](../docs/guides/creating-a-module.md).
