#!/usr/bin/env bash
# Run every repository check: module manifests, docs links, shell syntax,
# ShellCheck, markdownlint and unit tests.
#
# Environment:
#   AI_TOOLKIT_STRICT=1  Fail (instead of skip) when shellcheck or
#                        markdownlint-cli2 is not installed. CI sets this.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

STRICT="${AI_TOOLKIT_STRICT:-0}"
failures=0

step() {
  printf '\n==> %s\n' "$*"
}

record() {
  # record <status> <name>
  if [ "$1" -ne 0 ]; then
    failures=$((failures + 1))
    printf 'FAILED: %s\n' "$2" >&2
  fi
}

missing_tool() {
  if [ "$STRICT" = "1" ]; then
    printf 'FAILED: %s is required when AI_TOOLKIT_STRICT=1\n' "$1" >&2
    failures=$((failures + 1))
  else
    warn "$1 not found; skipping. $2"
  fi
}

require_node
cd "$REPO_ROOT"

shell_files=()
while IFS= read -r f; do
  shell_files+=("$f")
done < <(find scripts modules templates tests -type f -name '*.sh' -not -path '*/node_modules/*' | sort)

test_files=()
while IFS= read -r f; do
  test_files+=("$f")
done < <(find tests modules -type f -name '*.test.mjs' -not -path '*/node_modules/*' -not -path 'tests/fixtures/*' | sort)

step "Module manifests and documentation"
status=0
node scripts/lib/toolkit.mjs validate || status=$?
record "$status" "module validation"

step "Markdown links"
status=0
node scripts/lib/check-links.mjs || status=$?
record "$status" "markdown links"

step "Shell syntax (bash -n)"
status=0
for f in "${shell_files[@]}"; do
  bash -n "$f" || status=1
done
[ "$status" -eq 0 ] && info "ok   ${#shell_files[@]} shell script(s)"
record "$status" "shell syntax"

step "ShellCheck"
if command -v shellcheck >/dev/null 2>&1; then
  status=0
  shellcheck -x "${shell_files[@]}" || status=$?
  [ "$status" -eq 0 ] && info "ok   shellcheck $(shellcheck --version | sed -n 's/^version: //p')"
  record "$status" "shellcheck"
else
  missing_tool shellcheck "Install with 'brew install shellcheck'."
fi

step "Markdownlint"
if [ -x node_modules/.bin/markdownlint-cli2 ]; then
  status=0
  node_modules/.bin/markdownlint-cli2 || status=$?
  record "$status" "markdownlint"
else
  missing_tool markdownlint-cli2 "Run 'npm ci' to install the pinned dev dependency."
fi

step "Unit tests (${#test_files[@]} file(s))"
status=0
node --test "${test_files[@]}" || status=$?
record "$status" "unit tests"

echo
if [ "$failures" -ne 0 ]; then
  printf '%d check group(s) failed.\n' "$failures" >&2
  exit 1
fi
info "All checks passed."
