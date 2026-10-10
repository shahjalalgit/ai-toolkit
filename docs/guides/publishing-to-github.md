# Guide: publishing to GitHub

Nothing in the toolkit publishes automatically. These are the manual steps.

## 1. Before the first push

- Confirm the license (MIT, see [ADR 0004](../decisions/0004-license.md)).
- Run `npm run validate`.
- Check for secrets: `git grep -nE '(api[_-]?key|token|secret|password)\s*[:=]'`
  and review every hit.
- Decide public or private.

## 2. Create the repository and push

With the GitHub CLI (`gh auth status` must show you are logged in):

```bash
git add -A
git commit -m "feat: initial AI Toolkit"
gh repo create <owner>/ai-toolkit --private --source=. --remote=origin --push
```

Use `--public` instead of `--private` when you are ready. Without `gh`: create
an empty repository on github.com (no README, no license), then:

```bash
git remote add origin git@github.com:<owner>/ai-toolkit.git
git push -u origin main
```

## 3. Repository settings (on github.com)

- **Settings > Code security**: enable private vulnerability reporting,
  Dependabot alerts and security updates.
- **Settings > Branches**: protect `main`; require the CI checks to pass
  before merging.
- **About**: add a description and topics (for example `claude-code`,
  `automation`, `developer-tools`).

## 4. Confirm CI

Open the **Actions** tab, or:

```bash
gh run list --limit 5
gh run watch
```

Only after the workflow passes on GitHub should you add a status badge to the
README:

```markdown
[![CI](https://github.com/<owner>/ai-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/<owner>/ai-toolkit/actions/workflows/ci.yml)
```

## 5. First release (optional)

```bash
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes-file <(sed -n '/## \[0.1.0\]/,/^## \[/p' CHANGELOG.md | sed '$d')
```
