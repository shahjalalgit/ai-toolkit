#!/usr/bin/env bash
# Writes <output-dir>/<YYYY-MM-DD>.md from a task file. Intended to be called
# by a scheduler you configure yourself (launchd, cron). Never overwrites an
# existing summary for the same day.
#
# Usage: run-daily-summary.sh <tasks.json> <output-dir>
set -euo pipefail

if [ "$#" -ne 2 ]; then
  echo "usage: $(basename "$0") <tasks.json> <output-dir>" >&2
  exit 2
fi

input="$1"
out_dir="$2"
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ -f "$input" ] || { echo "error: input file not found: $input" >&2; exit 2; }
[ -d "$out_dir" ] || { echo "error: output directory not found: $out_dir" >&2; exit 2; }
command -v node >/dev/null 2>&1 || { echo "error: node not found on PATH ($PATH)" >&2; exit 2; }

today="$(date +%Y-%m-%d)"
node "$script_dir/../src/daily-summary.mjs" --input "$input" --date "$today" --output "$out_dir/$today.md"
