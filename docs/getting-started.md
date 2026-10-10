# Getting started

This walkthrough takes about 10 minutes and changes nothing outside a
temporary directory.

## 1. Check requirements

```bash
node --version    # v22 or later
bash --version    # 3.2 or later
jq --version      # only needed for Claude Code hooks
```

## 2. Get the code and validate it

```bash
git clone <repo-url> ai-toolkit
cd ai-toolkit
npm ci
./scripts/validate-repo.sh
```

The last line should read `All checks passed.` Without ShellCheck installed you
will see a warning that ShellCheck was skipped; that is fine locally.

## 3. Explore modules

```bash
./scripts/setup.sh list
./scripts/setup.sh info seo-automation
```

## 4. Run a module directly

No installation needed:

```bash
node modules/seo-automation/src/cli.mjs page modules/seo-automation/examples/bad-page.html
echo "exit code: $?"    # 1: the sample page has errors
```

## 5. Install into a scratch project

```bash
demo="$(mktemp -d)"
./scripts/setup.sh install claude-code-toolkit --target "$demo" --dry-run
./scripts/setup.sh install claude-code-toolkit --target "$demo"
find "$demo" -type f | sort
./scripts/setup.sh uninstall claude-code-toolkit --target "$demo"
```

## Next steps

- Install a module into a real project: [installation.md](installation.md).
- Build your own: [guides/creating-a-module.md](guides/creating-a-module.md).
