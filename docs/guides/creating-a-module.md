# Guide: creating a module

This walkthrough builds a small `changelog-lint` module that checks a
`CHANGELOG.md` has an `[Unreleased]` section. It uses only commands that exist
in the toolkit today.

## 1. Preview, then scaffold

```bash
./scripts/new-module.sh changelog-lint --name "Changelog Lint" \
  --description "Checks CHANGELOG.md follows Keep a Changelog basics." --dry-run
./scripts/new-module.sh changelog-lint --name "Changelog Lint" \
  --description "Checks CHANGELOG.md follows Keep a Changelog basics."
```

Created files:

```text
modules/changelog-lint/
├── CHANGELOG.md
├── README.md
├── module.json
├── src/cli.mjs
└── tests/cli.test.mjs
```

The new module already passes:

```bash
./scripts/setup.sh validate changelog-lint
./scripts/setup.sh test changelog-lint
```

## 2. Implement the logic

Replace `analyze()` in `src/cli.mjs`:

```js
export function analyze(text) {
  const hasUnreleased = /^## \[Unreleased\]/m.test(text);
  return { hasUnreleased, ok: hasUnreleased };
}
```

Update the human-readable output in `run()` to match, for example
`result.ok ? 'ok' : 'missing ## [Unreleased]'`.

## 3. Test it

Edit `tests/cli.test.mjs`:

```js
test('requires an Unreleased section', () => {
  assert.equal(analyze('# Changelog\n\n## [Unreleased]\n').ok, true);
  assert.equal(analyze('# Changelog\n\n## [1.0.0]\n').ok, false);
});
```

```bash
./scripts/setup.sh test changelog-lint
node modules/changelog-lint/src/cli.mjs CHANGELOG.md; echo "exit $?"
```

## 4. Document it

Fill in every `TODO` in `modules/changelog-lint/README.md`. In particular:

- **Status**: a capability table with honest labels.
- **Inputs and outputs**: the file it reads, output format, exit codes.
- **Permissions and side effects**: "Reads the file you pass. Writes nothing."

Keep `module.json` in sync (`permissions`, `entryPoints`, `install.files`).

## 5. Validate and register

```bash
npm run validate
```

Then add a row to the module catalog in the root `README.md`, an entry under
`[Unreleased]` in the root `CHANGELOG.md`, and open a pull request.

## 6. Try the installer

```bash
demo="$(mktemp -d)"
./scripts/setup.sh install changelog-lint --target "$demo"
node "$demo/.ai-toolkit/modules/changelog-lint/src/cli.mjs" CHANGELOG.md
```
