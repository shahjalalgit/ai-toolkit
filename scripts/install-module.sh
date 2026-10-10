#!/usr/bin/env bash
# Install one module into a project.
# Usage: ./scripts/install-module.sh <module> --target DIR [--dry-run] [--force]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/setup.sh" install "$@"
