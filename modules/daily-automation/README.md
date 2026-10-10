# Daily Automation

Repeatable personal developer workflows. The first workflow turns a task file
you maintain into a Markdown daily engineering summary.

## Purpose

Produce a consistent end-of-day (or start-of-day) summary without copying
status by hand, and give scheduled workflows a safe, observable pattern to
follow.

Supported use cases:

- A daily stand-up or hand-off note generated from `tasks.json`.
- A scheduled job that archives one summary per day into a folder.
- Input for Claude Code ("summarise my week from `summaries/`").

## Status

**Experimental (0.1.0).**

| Capability | Status |
| --- | --- |
| Daily summary from a JSON task file | Implemented |
| Scheduler wrapper script | Implemented |
| macOS launchd example | Example only (manual setup) |
| Pulling tasks from Jira, Linear, GitHub | Not implemented |
| Sending notifications or messages | Not implemented, by design |

## Prerequisites

- Node.js 22 or later. No npm packages.
- bash 3.2+ for the scheduler wrapper (macOS default is fine).

## Installation

Standalone: copy `modules/daily-automation/` anywhere.

Into a project or a personal "ops" folder:

```bash
./scripts/setup.sh install daily-automation --target ~/notes
```

This copies `src/` and `scripts/` to `.ai-toolkit/modules/daily-automation/`.
Nothing is scheduled.

## Usage

From `modules/daily-automation/`:

```bash
node src/daily-summary.mjs --input examples/tasks.json --date 2026-10-10
node src/daily-summary.mjs --input examples/tasks.json --output today.md
```

`--date` defaults to today in local time. `--output` refuses to overwrite an
existing file unless you pass `--force`.

### Scheduling on macOS

The toolkit never creates launch agents, cron jobs or background services. To
schedule the summary yourself:

1. Copy `examples/launchd/com.example.ai-toolkit.daily-summary.plist` to
   `~/Library/LaunchAgents/` and rename the label to something you own.
2. Replace every `/ABSOLUTE/PATH` placeholder. launchd does not expand `~` or
   environment variables.
3. launchd runs with a minimal `PATH`. If `node` lives in Homebrew, add an
   `EnvironmentVariables` dict with
   `PATH=/opt/homebrew/bin:/usr/bin:/bin`.
4. Load it: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/<file>.plist`
5. Test immediately: `launchctl kickstart gui/$(id -u)/<label>`
6. Check the log path configured in the plist.

To stop: `launchctl bootout gui/$(id -u)/<label>` and delete the plist.

The wrapper writes `<output-dir>/YYYY-MM-DD.md` and exits with code 2 if that
file already exists, so repeated runs on the same day are harmless.

## Inputs and outputs

Input (`--input`, JSON):

```json
{
  "tasks": [
    { "id": "ENG-102", "title": "Write contract tests", "status": "in_progress", "priority": "high", "due": "2026-10-12" }
  ],
  "notes": ["Optional free-form notes."]
}
```

| Field | Required | Values |
| --- | --- | --- |
| `title` | yes | non-empty string |
| `status` | yes | `todo`, `in_progress`, `blocked`, `done` |
| `id` | no | unique string |
| `priority` | no | `high`, `medium` (default), `low` |
| `due`, `completedOn` | no | `YYYY-MM-DD` |
| `notes` | no | string, shown under the task |

Output: Markdown on stdout, or a file with `--output`. Same input and date
always produce identical output.

Exit codes: `0` success, `1` invalid task data, `2` usage or I/O error
(including refusing to overwrite).

## Permissions and side effects

- Reads the input file. Writes only the `--output` file you name.
- No network access, no notifications, no background processes.

## Testing

```bash
./scripts/setup.sh test daily-automation
```

## Uninstall

```bash
./scripts/setup.sh uninstall daily-automation --target ~/notes
```

If you scheduled it, also run `launchctl bootout` and delete the plist (see
above). Generated summaries are yours and are never removed.

## Limitations

- Task data must already be in JSON; there are no tracker integrations yet.
- "Done today" relies on `completedOn` being set.
- Time zone: `--date` defaults to the machine's local date.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| launchd job never runs | `launchctl print gui/$(id -u)/<label>` shows status and last exit code. |
| `node not found on PATH` in the log | Add `EnvironmentVariables` with a `PATH` that includes your Node install. |
| Exit code 2 from the wrapper | The day's summary already exists, or a path is wrong. Check the log. |
| `invalid input` | The message lists each field to fix. |

## Compatibility

- Node.js 22+ on macOS and Linux. The launchd example is macOS-only.
- Manifest: `module.json` (schema v1).
