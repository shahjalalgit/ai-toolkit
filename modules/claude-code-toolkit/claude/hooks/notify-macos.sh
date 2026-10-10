#!/usr/bin/env bash
# Claude Code Notification hook: shows a local macOS notification when Claude
# needs attention. Local only: nothing is sent to any third-party service.
# On non-macOS systems it does nothing.
#
# Set AI_TOOLKIT_NOTIFY_DRY_RUN=1 to print the notification instead (tests).
set -uo pipefail

if ! command -v jq >/dev/null 2>&1; then
  echo "notify-macos: jq not found" >&2
  exit 1
fi

message="$(jq -r '.message // "Claude Code needs your attention"' 2>/dev/null)" || message="Claude Code needs your attention"
title="Claude Code"

if [ "${AI_TOOLKIT_NOTIFY_DRY_RUN:-0}" = "1" ]; then
  printf 'notify: %s: %s\n' "$title" "$message"
  exit 0
fi

[ "$(uname -s)" = "Darwin" ] || exit 0

# Pass the message as an argument so it is never interpreted as AppleScript.
osascript \
  -e 'on run argv' \
  -e 'display notification (item 1 of argv) with title (item 2 of argv)' \
  -e 'end run' \
  "$message" "$title" >/dev/null 2>&1 || true
exit 0
