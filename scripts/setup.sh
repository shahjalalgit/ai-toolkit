#!/usr/bin/env bash
# AI Toolkit central CLI. Thin wrapper around scripts/lib/toolkit.mjs.
# Run "./scripts/setup.sh --help" for usage.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

require_node
exec node "$SCRIPT_DIR/lib/toolkit.mjs" "$@"
