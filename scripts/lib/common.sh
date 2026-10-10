#!/usr/bin/env bash
# Shared helpers for AI Toolkit shell scripts. Source, do not execute.
# Compatible with the bash 3.2 that ships with macOS.

AI_TOOLKIT_MIN_NODE_MAJOR=22

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

warn() {
  printf 'warning: %s\n' "$*" >&2
}

info() {
  printf '%s\n' "$*"
}

# Fails unless a supported Node.js is on PATH.
require_node() {
  command -v node >/dev/null 2>&1 \
    || die "Node.js >= ${AI_TOOLKIT_MIN_NODE_MAJOR} is required (https://nodejs.org or 'brew install node')."
  local major
  major="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$major" -lt "$AI_TOOLKIT_MIN_NODE_MAJOR" ]; then
    die "Node.js >= ${AI_TOOLKIT_MIN_NODE_MAJOR} is required (found $(node --version))."
  fi
}
