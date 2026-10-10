#!/usr/bin/env bash
# Update a module previously installed into a project.
# Usage: ./scripts/update-module.sh <module> --target DIR [--dry-run] [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/setup.sh" update "$@"
