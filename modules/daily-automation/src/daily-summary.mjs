#!/usr/bin/env node
// Builds a Markdown daily engineering summary from an explicit task file.
// Reads only the file you pass; writes to stdout or to --output.
//
// Usage:
//   node src/daily-summary.mjs --input tasks.json [--date YYYY-MM-DD] [--output summary.md] [--force]
//
// Exit codes: 0 success, 1 invalid input data, 2 usage or I/O error.

import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const STATUSES = ['todo', 'in_progress', 'blocked', 'done'];
const PRIORITIES = ['high', 'medium', 'low'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isDate(s) {
  return typeof s === 'string' && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

export function localDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Returns a list of validation errors for the task file. */
export function validateInput(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.tasks)) return ['input must be an object with a "tasks" array'];
  const errors = [];
  const ids = new Set();
  data.tasks.forEach((t, i) => {
    const at = `tasks[${i}]`;
    if (!t || typeof t !== 'object') return errors.push(`${at} must be an object`);
    if (typeof t.title !== 'string' || !t.title.trim()) errors.push(`${at}.title is required`);
    if (!STATUSES.includes(t.status)) errors.push(`${at}.status must be one of ${STATUSES.join(', ')}`);
    if (t.priority !== undefined && !PRIORITIES.includes(t.priority)) errors.push(`${at}.priority must be one of ${PRIORITIES.join(', ')}`);
    for (const f of ['due', 'completedOn']) {
      if (t[f] !== undefined && !isDate(t[f])) errors.push(`${at}.${f} must be a YYYY-MM-DD date`);
    }
    if (t.id !== undefined) {
      if (ids.has(t.id)) errors.push(`${at}.id "${t.id}" is duplicated`);
      ids.add(t.id);
    }
  });
  if (data.notes !== undefined && (!Array.isArray(data.notes) || data.notes.some((n) => typeof n !== 'string'))) {
    errors.push('notes must be an array of strings');
  }
  return errors;
}

const rank = { high: 0, medium: 1, low: 2 };
const byPriorityThenDue = (a, b) =>
  (rank[a.priority ?? 'medium'] - rank[b.priority ?? 'medium'])
  || (a.due ?? '9999-12-31').localeCompare(b.due ?? '9999-12-31')
  || a.title.localeCompare(b.title);

function line(t) {
  const bits = [t.id ? `**${t.id}**` : null, t.title, t.priority === 'high' ? '(high)' : null, t.due ? `- due ${t.due}` : null];
  const main = bits.filter(Boolean).join(' ');
  return t.notes ? `- ${main}\n  - ${t.notes}` : `- ${main}`;
}

/** Pure function: same input and date always produce the same Markdown. */
export function buildSummary(data, date) {
  const tasks = data.tasks;
  const done = tasks.filter((t) => t.status === 'done' && t.completedOn === date).sort(byPriorityThenDue);
  const inProgress = tasks.filter((t) => t.status === 'in_progress').sort(byPriorityThenDue);
  const blocked = tasks.filter((t) => t.status === 'blocked').sort(byPriorityThenDue);
  const open = tasks.filter((t) => t.status !== 'done');
  const overdue = open.filter((t) => t.due && t.due < date).sort(byPriorityThenDue);
  const dueToday = open.filter((t) => t.due === date).sort(byPriorityThenDue);
  const next = tasks.filter((t) => t.status === 'todo').sort(byPriorityThenDue).slice(0, 3);

  const section = (title, list, empty) => [`## ${title}`, '', ...(list.length ? list.map(line) : [`_${empty}_`]), ''];
  const out = [
    `# Daily summary - ${date}`,
    '',
    `${done.length} done today, ${inProgress.length} in progress, ${blocked.length} blocked, ${overdue.length} overdue.`,
    '',
    ...section('Done today', done, 'Nothing completed today.'),
    ...section('In progress', inProgress, 'Nothing in progress.'),
    ...section('Blocked', blocked, 'No blockers.'),
    ...section('Overdue', overdue, 'Nothing overdue.'),
    ...section('Due today', dueToday, 'Nothing due today.'),
    ...section('Next up', next, 'No open todo items.'),
  ];
  if (data.notes?.length) out.push('## Notes', '', ...data.notes.map((n) => `- ${n}`), '');
  return `${out.join('\n').trimEnd()}\n`;
}

const USAGE = 'Usage: daily-summary --input <tasks.json> [--date YYYY-MM-DD] [--output <file.md>] [--force]';

export function run(argv, now = new Date()) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '-h' || a === '--help') o.help = true;
    else if (['--input', '--date', '--output'].includes(a) && argv[i + 1] !== undefined) o[a.slice(2)] = argv[++i];
    else {
      process.stderr.write(`error: unexpected argument ${a}\n${USAGE}\n`);
      return 2;
    }
  }
  if (o.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (!o.input) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const date = o.date ?? localDate(now);
  if (!isDate(date)) {
    process.stderr.write(`error: --date must be YYYY-MM-DD\n`);
    return 2;
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(o.input, 'utf8'));
  } catch (e) {
    process.stderr.write(`error: cannot read ${o.input}: ${e.code ?? e.message}\n`);
    return 2;
  }
  const errors = validateInput(data);
  if (errors.length) {
    process.stderr.write(`error: invalid input:\n${errors.map((e) => `  - ${e}`).join('\n')}\n`);
    return 1;
  }
  const md = buildSummary(data, date);
  if (!o.output) {
    process.stdout.write(md);
    return 0;
  }
  if (fs.existsSync(o.output) && !o.force) {
    process.stderr.write(`error: ${o.output} exists; pass --force to overwrite\n`);
    return 2;
  }
  fs.writeFileSync(o.output, md);
  process.stdout.write(`Wrote ${o.output}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  process.exitCode = run(process.argv.slice(2));
}
