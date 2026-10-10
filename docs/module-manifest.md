# Module manifest reference (`module.json`, schema v1)

The manifest describes a module for discovery, documentation and
installation. It is **data only**: the toolkit never executes anything from
it. Validation lives in `scripts/lib/toolkit.mjs` (`validateManifest`), which
is the source of truth for this page.

## Example

```json
{
  "schemaVersion": 1,
  "id": "seo-automation",
  "name": "SEO Automation",
  "version": "0.1.0",
  "description": "Deterministic technical SEO checks.",
  "type": "cli",
  "status": "experimental",
  "runtime": { "node": ">=22" },
  "dependencies": [],
  "entryPoints": { "cli": "src/cli.mjs" },
  "env": [],
  "permissions": ["fs:read"],
  "install": {
    "files": [
      { "source": "src", "target": ".ai-toolkit/modules/seo-automation/src" }
    ]
  },
  "tests": "tests",
  "compatibility": { "os": ["macos", "linux"], "notes": "Local files only." }
}
```

## Fields

| Field | Required | Type | Rules |
| --- | --- | --- | --- |
| `schemaVersion` | yes | number | Must be `1` |
| `id` | yes | string | kebab-case `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, max 64, equals the directory name |
| `name` | yes | string | 1-80 chars, display name |
| `version` | yes | string | Semantic version, e.g. `0.1.0`, `1.2.0-beta.1` |
| `description` | yes | string | 1-300 chars |
| `type` | yes | string | `cli`, `claude-code`, `workflow` or `library` |
| `status` | yes | string | `stable`, `experimental` or `planned` |
| `runtime` | no | object | Keys: `node`, `bash`, `python`, `jq`, `claude-code`. Values: version range strings such as `">=22"` |
| `dependencies` | no | string[] | External tools or packages a user must install (informational) |
| `entryPoints` | no | object | kebab-case name to relative path; the path must exist |
| `env` | no | object[] | `{ "name": "UPPER_SNAKE", "required": bool, "description": "..." }` |
| `permissions` | no | string[] | `fs:read`, `fs:write`, `network`, `exec`, `notify` |
| `install` | no | object | `{ "files": [{ "source", "target" }] }` |
| `tests` | no | string | Relative directory containing `*.test.mjs` files |
| `compatibility` | no | object | `os`: non-empty subset of `macos`, `linux`; `notes`: string |

Unknown fields anywhere at the top level, in `install`, in `install.files[]`
or in `compatibility` are errors.

### Paths

All paths (`entryPoints`, `install.files[].source`, `install.files[].target`,
`tests`) must be:

- relative, using `/`, normalised (no `.`, `..` or empty segments), max 255
  characters;
- for sources, entry points and tests: existing inside the module and not a
  symlink (symlinks inside copied directories are rejected at install time);
- for targets: not inside `.git/` and not overlapping `.ai-toolkit/state/`.

A `source` may be a file or a directory. Directories are copied recursively
(`.DS_Store` is skipped). Two sources may not map to the same target file.

### Permissions vocabulary

| Permission | Declare when the module... |
| --- | --- |
| `fs:read` | reads files the user passes |
| `fs:write` | writes files (other than via the installer) |
| `network` | makes any network request |
| `exec` | runs other programs (including Claude Code agents running shell commands) |
| `notify` | shows notifications or sends messages |

Permissions are documentation for reviewers and users; they are not enforced
at runtime. Keep them accurate and minimal.

### Conventions for install targets

- Claude Code assets: `.claude/skills/<name>`, `.claude/agents`,
  `.claude/hooks`.
- Vendored code and reference files:
  `.ai-toolkit/modules/<module-id>/...`.
- Never target shared configuration files (for example
  `.claude/settings.json`); ship an example and document the manual step.

## Versioning the schema

Adding an optional field is backwards compatible and keeps `schemaVersion: 1`.
Removing or changing the meaning of a field requires `schemaVersion: 2` and a
migration note in the root changelog.
