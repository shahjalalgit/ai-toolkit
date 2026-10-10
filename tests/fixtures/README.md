# Test fixtures

Modules used only by `tests/scripts/*.test.mjs`. They are loaded by pointing
`AI_TOOLKIT_MODULES_DIR` at `tests/fixtures/modules`.

- `good-module`: valid manifest, nested files and an executable script.
- `bad-manifest`: invalid id, type, version, empty name and an unknown
  `postinstall` field that must be rejected.
- `unsafe-target`: install paths that escape the module or the target.

Fixture READMEs are minimal on purpose.
