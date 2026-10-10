#!/usr/bin/env node
// Verifies that relative links in Markdown files point at existing files and,
// for links with a #fragment into a Markdown file, at an existing heading.
// External (http/https/mailto) links are not fetched.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP_DIRS = new Set(['.git', 'node_modules']);

function markdownFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(p));
    else if (entry.name.endsWith('.md')) out.push(p);
  }
  return out;
}

function stripCode(text) {
  return text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
}

/** GitHub-style heading anchors for a Markdown file. */
export function anchorsFor(text) {
  const anchors = new Set();
  const counts = new Map();
  for (const line of stripCode(text).split('\n')) {
    const m = /^#{1,6}\s+(.*?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const base = m[1]
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s_-]/gu, '')
      .replace(/\s/g, '-');
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    anchors.add(n === 0 ? base : `${base}-${n}`);
  }
  return anchors;
}

const problems = [];
const files = markdownFiles(ROOT);
const anchorCache = new Map();
for (const file of files) {
  const text = stripCode(fs.readFileSync(file, 'utf8'));
  const linkRe = /!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  for (const [, target] of text.matchAll(linkRe)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
    const [rawPath, fragment] = target.split('#');
    const resolved = rawPath ? path.resolve(path.dirname(file), decodeURIComponent(rawPath)) : file;
    const rel = path.relative(ROOT, file);
    if (!fs.existsSync(resolved)) {
      problems.push(`${rel}: broken link -> ${target}`);
      continue;
    }
    if (fragment && resolved.endsWith('.md')) {
      if (!anchorCache.has(resolved)) anchorCache.set(resolved, anchorsFor(fs.readFileSync(resolved, 'utf8')));
      if (!anchorCache.get(resolved).has(fragment)) problems.push(`${rel}: missing anchor -> ${target}`);
    }
  }
}

if (problems.length) {
  for (const p of problems) process.stderr.write(`${p}\n`);
  process.stderr.write(`${problems.length} broken link(s) in ${files.length} Markdown file(s).\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`ok   ${files.length} Markdown file(s), no broken relative links\n`);
}
