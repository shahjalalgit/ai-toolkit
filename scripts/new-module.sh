#!/usr/bin/env bash
# Scaffold a new module from templates/module-template.
# Usage: ./scripts/new-module.sh <module-id> --name "Display Name" [--description "..."] [--dry-run]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/setup.sh" new "$@"
