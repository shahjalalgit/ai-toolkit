# Module development

How to build a module that passes review and stays maintainable.

## 1. Decide whether it is a module

A module is worth adding when it is reusable across projects, has a clear
input and output, and can be tested offline. One-off scripts belong in your
own project.

## 2. Scaffold

```bash
./scripts/new-module.sh <module-id> --name "Display Name" --description "One sentence."
```

This copies [templates/module-template](../templates/module-template/TEMPLATE.md)
to `modules/<module-id>/` with placeholders filled in. The result already
validates and its example test passes. Walkthrough:
[guides/creating-a-module.md](guides/creating-a-module.md).

## 3. Layout

Use only what you need:

```text
modules/<id>/
├── module.json        required
├── README.md          required (sections below)
├── CHANGELOG.md       required
├── src/               code; pure functions + thin CLI
├── tests/             *.test.mjs (node:test)
├── examples/          synthetic sample inputs
├── claude/            skills/, agents/, hooks/ for Claude Code
├── config/            example configuration (never real secrets)
├── templates/         files users copy and fill in
└── scripts/           shell helpers
```

## 4. README sections

`setup.sh validate` requires these `##` headings, in any order: Purpose,
Status, Prerequisites, Installation, Usage, Inputs and outputs, Permissions
and side effects, Testing, Uninstall, Limitations, Troubleshooting,
Compatibility. Use `###` subsections for anything else (Configuration,
Security considerations).

The **Status** section must contain an honest capability table: Implemented,
Planned or Not implemented. Do not list planned work as a feature.

## 5. Code conventions

- Runtime: prefer Node 22+ with the standard library, or bash 3.2. Another
  runtime is fine when justified; declare it in `runtime`.
- Put logic in exported pure functions; keep CLI parsing thin so tests can
  call functions directly.
- Exit codes: `0` success, `1` check failed, `2` usage or I/O error.
- Offer `--json` output for anything another tool might consume.
- Never overwrite user files without an explicit flag.
- Detect "run as main" with
  `import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href`.

## 6. Side effects and safety

- Default to read-only and local. Anything that touches the network, sends
  messages, schedules jobs or writes to external systems must be opt-in,
  documented under Permissions and side effects, declared in `permissions`,
  and confirmed by the user at run time when externally visible.
- Read secrets from environment variables listed in `env`. Provide a
  `.env.example` with fake values only if the module needs secrets.
- Do not log secrets or customer data.

See [security.md](security.md).

## 7. Claude Code assets

Use the [agent](../templates/agent-template/README.md) and
[skill](../templates/skill-template/README.md) templates. Give agents the
minimum tools. Mark skills with side effects `disable-model-invocation: true`.
Ship hooks as scripts plus an example settings snippet; never edit the user's
settings automatically.

## 8. Tests

- Use `node:test` and `node:assert/strict`.
- Use fixtures in `examples/` or `tests/`, and `fs.mkdtempSync` for anything
  written. No network access.
- Cover: happy path, each rule or failure mode, CLI exit codes, and refusal
  to overwrite.

```bash
./scripts/setup.sh test <id>
npm run validate
```

## 9. Release a module change

1. Add entries under `## [Unreleased]` in the module changelog.
2. When releasing, move them under a version heading and bump `version` in
   `module.json` following [CONTRIBUTING.md](../CONTRIBUTING.md#versioning-and-releases).
3. Update the catalog table in the root README if status or scope changed.
