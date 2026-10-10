// Deterministic ticket (requirements) validation for Markdown tickets.
// A ticket is "ready" when it has a summary, testable acceptance criteria
// written as a checklist, a test plan, and no unresolved placeholders.

const REQUIRED = ['Summary', 'Acceptance Criteria', 'Test Plan'];
const RECOMMENDED = ['Out of Scope', 'Risks'];
const VAGUE = ['fast', 'quickly', 'user-friendly', 'intuitive', 'robust', 'properly', 'appropriate', 'as needed', 'etc', 'and so on', 'should work', 'seamless', 'easy'];
const PLACEHOLDER_RE = /\b(TBD|TODO|FIXME|XXX)\b|\?\?\?/;

export function parseSections(markdown) {
  const sections = new Map();
  let current = null;
  let inFence = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence && /^##\s+(.+?)\s*#*$/.exec(line);
    if (m) {
      current = m[1].trim().toLowerCase();
      sections.set(current, []);
    } else if (current) sections.get(current).push(line);
  }
  return sections;
}

function section(sections, name) {
  const key = [...sections.keys()].find((k) => k === name.toLowerCase() || k.startsWith(`${name.toLowerCase()} `));
  return key === undefined ? undefined : sections.get(key);
}

export function validateTicket(markdown) {
  const findings = [];
  const add = (level, rule, message) => findings.push({ level, rule, message });
  const sections = parseSections(markdown);

  if (!/^#\s+\S/m.test(markdown)) add('error', 'title-missing', 'Ticket needs a "# Title" heading.');
  for (const name of REQUIRED) {
    const body = section(sections, name);
    if (body === undefined) add('error', 'section-missing', `Missing "## ${name}" section.`);
    else if (!body.join('').trim()) add('error', 'section-empty', `"## ${name}" is empty.`);
  }
  for (const name of RECOMMENDED) {
    if (section(sections, name) === undefined) add('warning', 'section-recommended', `Consider adding a "## ${name}" section.`);
  }

  const criteria = (section(sections, 'Acceptance Criteria') ?? [])
    .map((l) => /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(l))
    .filter(Boolean)
    .map((m) => m[2].trim());
  if (section(sections, 'Acceptance Criteria') !== undefined && criteria.length === 0) {
    add('error', 'criteria-format', 'Acceptance criteria must be a checklist ("- [ ] ...").');
  }
  criteria.forEach((c, i) => {
    const vague = VAGUE.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(c));
    if (vague.length) add('warning', 'criteria-vague', `Criterion ${i + 1} uses untestable wording (${vague.join(', ')}): "${c}"`);
    if (c.split(/\s+/).length < 4) add('warning', 'criteria-short', `Criterion ${i + 1} is very short; make the expected behaviour explicit: "${c}"`);
  });

  markdown.split(/\r?\n/).forEach((line, i) => {
    if (PLACEHOLDER_RE.test(line)) add('error', 'placeholder', `Line ${i + 1} has an unresolved placeholder: "${line.trim()}"`);
  });

  return { ready: !findings.some((f) => f.level === 'error'), criteria: criteria.length, findings };
}
