# Module template

This directory is copied by `./scripts/new-module.sh` (or
`./scripts/setup.sh new`). Placeholders replaced at creation time:

| Placeholder | Value |
| --- | --- |
| `{{MODULE_ID}}` | kebab-case id given on the command line |
| `{{MODULE_NAME}}` | `--name` |
| `{{MODULE_DESCRIPTION}}` | `--description` (defaults to a TODO) |
| `{{DATE}}` | today, `YYYY-MM-DD` |

This `TEMPLATE.md` file itself is not copied. See
[docs/module-development.md](../../docs/module-development.md).
