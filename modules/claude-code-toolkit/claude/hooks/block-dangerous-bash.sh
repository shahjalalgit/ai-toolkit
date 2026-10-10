#!/usr/bin/env bash
# Claude Code PreToolUse hook (matcher: Bash).
# Blocks a short list of catastrophic or remote-code-execution shell patterns.
# This is a guardrail against mistakes, not a security sandbox: obfuscated
# commands can bypass pattern matching.
#
# Exit codes: 0 allow, 2 block (stderr is shown to Claude), 1 hook error
# (non-blocking; stderr is shown to the user).
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "block-dangerous-bash: jq not found; command NOT checked. Install jq." >&2
  exit 1
fi

cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)" || {
  echo "block-dangerous-bash: could not parse hook input" >&2
  exit 1
}
[ -z "$cmd" ] && exit 0

# Each entry: <extended regex>|<reason>. Reasons must not contain "|".
# shellcheck disable=SC2016 # literal $HOME in patterns is intentional
patterns=(
  '(^|[^[:alnum:]_-])rm[[:space:]]+(-[[:alnum:]-]+[[:space:]]+)+["'"'"']?(/|/\*|~|~/|~/\*|\$HOME|\$\{HOME\}|\.\.)/?["'"'"']?([[:space:]]|$)|rm with flags targeting /, ~, $HOME or the parent directory'
  '(curl|wget)[^|;&]*\|[[:space:]]*(sudo[[:space:]]+)?(ba|z|da|k)?sh([[:space:]]|$)|piping a download into a shell'
  'git[[:space:]]+push[^;&|]*(--force([[:space:]]|$)|[[:space:]]-f([[:space:]]|$))[^;&|]*(main|master)|force-push to main/master'
  'git[[:space:]]+push[^;&|]*[[:space:]]\+(main|master)([[:space:]]|$)|force-push to main/master'
  '(^|[^[:alnum:]_-])mkfs(\.[[:alnum:]]+)?[[:space:]]|formatting a filesystem'
  '(^|[^[:alnum:]_-])dd[[:space:]].*of=/dev/(r?disk|sd|nvme|hd)|writing directly to a disk device'
  'chmod[[:space:]]+-R[[:space:]]+(0?777|a\+rwx)[[:space:]]+/([[:space:]]|$)|recursive chmod 777 on /'
  ':\(\)[[:space:]]*\{[[:space:]]*:[[:space:]]*\|[[:space:]]*:[[:space:]]*&[[:space:]]*\}|fork bomb'
)

for entry in "${patterns[@]}"; do
  regex="${entry%|*}"
  reason="${entry##*|}"
  if printf '%s\n' "$cmd" | grep -Eq -- "$regex"; then
    echo "Blocked by block-dangerous-bash hook: ${reason}. Ask the user to run this command manually if it is really intended." >&2
    exit 2
  fi
done

exit 0
