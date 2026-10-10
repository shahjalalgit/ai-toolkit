import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkContent, checkPage, checkRobots, checkSitemap } from '../src/checks.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const example = (f) => fs.readFileSync(path.join(dir, '..', 'examples', f), 'utf8');
const rules = (findings) => findings.map((f) => f.rule);
const errors = (findings) => findings.filter((f) => f.level === 'error').map((f) => f.rule);

test('good page has no errors or warnings', () => {
  const findings = checkPage(example('good-page.html'), { url: 'https://www.example.com/guides/validate-sitemap' });
  assert.deepEqual(findings.filter((f) => f.level !== 'info'), []);
});

test('bad page reports canonical, robots, alt, lang and JSON-LD problems', () => {
  const r = rules(checkPage(example('bad-page.html')));
  for (const rule of ['canonical-multiple', 'robots-noindex', 'img-alt-missing', 'html-lang-missing',
    'viewport-missing', 'description-missing', 'structured-data-invalid-json', 'title-length', 'h1-multiple', 'render-blocking-scripts']) {
    assert.ok(r.includes(rule), `expected ${rule} in ${r.join(', ')}`);
  }
});

test('relative canonical is an error', () => {
  const html = '<html lang="en"><head><title>A reasonable title</title><link rel="canonical" href="/x"></head></html>';
  assert.ok(errors(checkPage(html)).includes('canonical-relative'));
});

test('structured data: missing required properties and @graph support', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
    {"@type":"Product","name":"Widget"},{"@type":"Organization","name":"Org","url":"https://example.com"}]}</script>`;
  const f = checkPage(html).filter((x) => x.rule === 'structured-data-property');
  assert.equal(f.length, 1);
  assert.match(f[0].message, /offers or review or aggregateRating/);
});

test('robots: blocking everything is an error; AI crawler groups are reported', () => {
  assert.ok(errors(checkRobots('User-agent: *\nDisallow: /\n')).includes('robots-blocks-all'));
  const f = checkRobots(example('robots.txt'));
  assert.deepEqual(errors(f), []);
  assert.ok(f.some((x) => x.rule === 'robots-ai-crawler' && /GPTBot: disallowed/.test(x.message)));
  assert.ok(rules(checkRobots('User-agent: *\nDisallow:\n')).includes('robots-no-sitemap'));
});

test('sitemap: relative loc, duplicates and bad lastmod', () => {
  const f = checkSitemap(example('sitemap.xml'), { baseUrl: 'https://www.example.com' });
  assert.ok(errors(f).includes('sitemap-loc-invalid'));
  assert.ok(rules(f).includes('sitemap-duplicate'));
  assert.ok(rules(f).includes('sitemap-lastmod'));
  assert.ok(errors(checkSitemap('<html></html>')).includes('sitemap-root'));
});

test('sitemap: foreign host rejected with --base-url', () => {
  const xml = '<urlset><url><loc>https://other.example.org/</loc></url></urlset>';
  assert.ok(errors(checkSitemap(xml, { baseUrl: 'https://www.example.com' })).includes('sitemap-foreign-host'));
});

test('content heuristics are labelled heuristic', () => {
  const f = checkContent(example('good-page.html'));
  assert.ok(f.every((x) => x.kind === 'heuristic'));
  assert.ok(!rules(f).includes('content-answer-missing'));
  assert.ok(!rules(f).includes('content-no-author'));
  const bad = rules(checkContent('<body><h2>What is X?</h2><h2>Next</h2></body>'));
  assert.ok(bad.includes('content-answer-missing'));
  assert.ok(bad.includes('content-thin'));
});

test('CLI exit codes: 0 clean, 1 errors, 2 usage', () => {
  const cli = path.join(dir, '..', 'src', 'cli.mjs');
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  assert.equal(run('page', path.join(dir, '..', 'examples', 'good-page.html')).status, 0);
  const bad = run('page', path.join(dir, '..', 'examples', 'bad-page.html'), '--json');
  assert.equal(bad.status, 1);
  assert.ok(Array.isArray(JSON.parse(bad.stdout).findings));
  assert.equal(run('nope', 'x').status, 2);
  assert.equal(run('page', '/nonexistent/file.html').status, 2);
});
