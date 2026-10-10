# {{MODULE_NAME}}

{{MODULE_DESCRIPTION}}

<!-- Replace every TODO below. Keep all "##" sections: validate-repo.sh checks them. -->

## Purpose

TODO: the problem this module solves and its supported use cases.

## Status

**Experimental (0.1.0).** TODO: list each capability as Implemented, Planned
or Not implemented.

## Prerequisites

- Node.js 22 or later. TODO: other tools, accounts or access.

## Installation

Standalone: copy `modules/{{MODULE_ID}}/` and run `node src/cli.mjs`.

Into a project:

```bash
./scripts/setup.sh install {{MODULE_ID}} --target /path/to/project --dry-run
./scripts/setup.sh install {{MODULE_ID}} --target /path/to/project
```

### Configuration

TODO: configuration files or environment variables. Document every variable in
`module.json` `env` too. Never commit real secrets; use `.env.example` with fake
values.

## Usage

```bash
node src/cli.mjs README.md
```

## Inputs and outputs

TODO: input formats, output formats, exit codes.

## Permissions and side effects

TODO: files read and written, network calls, external services, anything
visible to other people. Keep `module.json` `permissions` in sync.

### Security considerations

TODO: secrets handling, untrusted input, confirmation before destructive or
externally visible actions.

## Testing

```bash
./scripts/setup.sh test {{MODULE_ID}}
```

## Uninstall

```bash
./scripts/setup.sh uninstall {{MODULE_ID}} --target /path/to/project
```

## Limitations

TODO: known gaps and unsupported cases.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| TODO | TODO |

## Compatibility

- Node.js 22+ on macOS and Linux. Manifest: `module.json` (schema v1).
