#!/usr/bin/env bash
# Claude Code PreToolUse hook (matcher: Read|Edit|MultiEdit|Write).
# Stops Claude from reading or writing files that usually hold secrets.
# Example files such as .env.example are allowed.
#
# Exit codes: 0 allow, 2 block (stderr is shown to Claude), 1 hook error.
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "protect-secret-files: jq not found; file NOT checked. Install jq." >&2
  exit 1
fi

file="$(jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)" || {
  echo "protect-secret-files: could not parse hook input" >&2
  exit 1
}
[ -z "$file" ] && exit 0

name="$(basename -- "$file")"

case "$name" in
  .env.example | .env.sample | .env.template | *.example | *.sample)
    exit 0
    ;;
  .env | .env.* | *.pem | *.key | *.p12 | *.pfx | id_rsa* | id_ed25519* | id_ecdsa* | .netrc | .npmrc | .pypirc | credentials | credentials.json | secrets.json | secrets.yml | secrets.yaml)
    echo "Blocked by protect-secret-files hook: '$name' may contain secrets. Ask the user to inspect or edit it manually." >&2
    exit 2
    ;;
esac

exit 0
