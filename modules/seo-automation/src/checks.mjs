// Deterministic technical SEO checks and clearly labelled content heuristics.
//
// Every finding has:
//   level: "error" | "warning" | "info"
//   kind:  "check"      - objective, rule-based (e.g. invalid JSON-LD)
//          "guideline"  - widely used convention, not a search-engine rule
//                         (e.g. title length)
//          "heuristic"  - content-quality signal for AEO/GEO; subjective
//   rule:  stable identifier
//   message

import { extractPage, findElements, textContent, wordCount } from './html.mjs';

const finding = (level, kind, rule, message) => ({ level, kind, rule, message });

function isAbsoluteHttpUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(u) {
  const url = new URL(u);
  url.hash = '';
  return url.href.replace(/\/$/, '');
}

// ----------------------------------------------------------------- page

const STRUCTURED_DATA_RULES = {
  Article: [['headline'], ['author'], ['datePublished']],
  BlogPosting: [['headline'], ['author'], ['datePublished']],
  NewsArticle: [['headline'], ['author'], ['datePublished']],
  Product: [['name'], ['offers', 'review', 'aggregateRating']],
  Organization: [['name'], ['url']],
  BreadcrumbList: [['itemListElement']],
  FAQPage: [['mainEntity']],
  WebSite: [['name'], ['url']],
};

function structuredDataFindings(blocks) {
  const out = [];
  if (blocks.length === 0) {
    out.push(finding('info', 'check', 'structured-data-missing', 'No JSON-LD structured data found.'));
    return out;
  }
  blocks.forEach((raw, i) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      out.push(finding('error', 'check', 'structured-data-invalid-json', `JSON-LD block ${i + 1} is not valid JSON: ${e.message}`));
      return;
    }
    const roots = Array.isArray(data) ? data : [data];
    for (const root of roots) {
      const context = JSON.stringify(root?.['@context'] ?? '');
      if (!/schema\.org/.test(context)) {
        out.push(finding('error', 'check', 'structured-data-context', `JSON-LD block ${i + 1} has no schema.org @context.`));
      }
      const nodes = Array.isArray(root?.['@graph']) ? root['@graph'] : [root];
      for (const node of nodes) {
        const types = [].concat(node?.['@type'] ?? []);
        if (types.length === 0) {
          out.push(finding('error', 'check', 'structured-data-type', `JSON-LD block ${i + 1} has a node without @type.`));
          continue;
        }
        for (const type of types) {
          for (const alternatives of STRUCTURED_DATA_RULES[type] ?? []) {
            if (!alternatives.some((p) => node[p] !== undefined && node[p] !== '')) {
              out.push(finding('warning', 'check', 'structured-data-property',
                `${type} is missing ${alternatives.join(' or ')} (commonly required for rich results).`));
            }
          }
          if (type === 'FAQPage' && Array.isArray(node.mainEntity)) {
            node.mainEntity.forEach((q, qi) => {
              if (!q?.name || !q?.acceptedAnswer?.text) {
                out.push(finding('warning', 'check', 'structured-data-faq', `FAQPage question ${qi + 1} needs name and acceptedAnswer.text.`));
              }
            });
          }
        }
      }
    }
  });
  return out;
}

export function checkPage(html, { url } = {}) {
  const p = extractPage(html);
  const out = [];

  if (p.titles.length === 0 || !p.titles[0]) out.push(finding('error', 'check', 'title-missing', 'Page has no <title>.'));
  else {
    if (p.titles.length > 1) out.push(finding('warning', 'check', 'title-multiple', `Page has ${p.titles.length} <title> elements.`));
    const len = p.titles[0].length;
    if (len < 10 || len > 60) out.push(finding('warning', 'guideline', 'title-length', `Title is ${len} characters; 10-60 is a common guideline to avoid truncation.`));
  }

  if (!p.description) out.push(finding('warning', 'check', 'description-missing', 'No <meta name="description">.'));
  else if (p.description.length < 50 || p.description.length > 160) {
    out.push(finding('info', 'guideline', 'description-length', `Meta description is ${p.description.length} characters; 50-160 is a common guideline.`));
  }

  if (p.canonicals.length === 0) out.push(finding('warning', 'check', 'canonical-missing', 'No <link rel="canonical">.'));
  else if (p.canonicals.length > 1) out.push(finding('error', 'check', 'canonical-multiple', `Page declares ${p.canonicals.length} canonical URLs.`));
  else {
    const c = p.canonicals[0];
    if (!isAbsoluteHttpUrl(c)) out.push(finding('error', 'check', 'canonical-relative', `Canonical "${c}" is not an absolute http(s) URL.`));
    else {
      if (c.startsWith('http:')) out.push(finding('warning', 'check', 'canonical-http', 'Canonical URL uses http instead of https.'));
      if (url && isAbsoluteHttpUrl(url) && normalizeUrl(c) !== normalizeUrl(url)) {
        out.push(finding('info', 'check', 'canonical-not-self', `Canonical points to ${c}, not the page URL ${url}. Verify this is intentional.`));
      }
    }
  }

  if (p.robots && /noindex/i.test(p.robots)) out.push(finding('warning', 'check', 'robots-noindex', `Meta robots is "${p.robots}"; the page asks not to be indexed.`));
  if (!p.lang) out.push(finding('warning', 'check', 'html-lang-missing', '<html> has no lang attribute (accessibility and language targeting).'));
  if (!p.viewport) out.push(finding('warning', 'check', 'viewport-missing', 'No <meta name="viewport"> (mobile rendering).'));

  if (p.h1.length === 0) out.push(finding('warning', 'guideline', 'h1-missing', 'Page has no <h1>.'));
  else if (p.h1.length > 1) out.push(finding('info', 'guideline', 'h1-multiple', `Page has ${p.h1.length} <h1> elements.`));

  const noAlt = p.images.filter((img) => img.alt === undefined);
  if (noAlt.length) out.push(finding('warning', 'check', 'img-alt-missing', `${noAlt.length} <img> element(s) have no alt attribute (use alt="" for decorative images).`));

  const blocking = p.headScripts.filter((s) => s.src && !('async' in s) && !('defer' in s) && (s.type ?? '') !== 'module');
  if (blocking.length) out.push(finding('info', 'guideline', 'render-blocking-scripts', `${blocking.length} external script(s) in <head> without async/defer.`));
  if (p.bytes > 500_000) out.push(finding('info', 'guideline', 'html-size', `HTML is ${Math.round(p.bytes / 1024)} KB; large documents slow down rendering.`));

  out.push(...structuredDataFindings(p.jsonLd));
  return out;
}

// --------------------------------------------------------------- robots

const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Google-Extended', 'PerplexityBot', 'CCBot', 'Applebot-Extended'];
const ROBOTS_DIRECTIVES = new Set(['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host', 'clean-param']);

export function parseRobots(text) {
  const groups = [];
  const sitemaps = [];
  const unknown = [];
  let current = null;
  let lastWasAgent = false;
  text.split(/\r?\n/).forEach((rawLine, i) => {
    const line = rawLine.replace(/#.*/, '').trim();
    if (!line) return;
    const idx = line.indexOf(':');
    if (idx === -1) {
      unknown.push({ line: i + 1, text: rawLine });
      return;
    }
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    if (!ROBOTS_DIRECTIVES.has(key)) unknown.push({ line: i + 1, text: rawLine });
    if (key === 'sitemap') {
      sitemaps.push(value);
      return;
    }
    if (key === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value);
      lastWasAgent = true;
      return;
    }
    lastWasAgent = false;
    if (current && (key === 'allow' || key === 'disallow')) current.rules.push({ type: key, path: value });
  });
  return { groups, sitemaps, unknown };
}

function blocksAll(group) {
  return group.rules.some((r) => r.type === 'disallow' && r.path === '/') && !group.rules.some((r) => r.type === 'allow' && r.path === '/');
}

export function checkRobots(text) {
  const { groups, sitemaps, unknown } = parseRobots(text);
  const out = [];
  if (groups.length === 0) out.push(finding('info', 'check', 'robots-no-groups', 'robots.txt has no User-agent groups; everything is crawlable.'));
  for (const u of unknown) out.push(finding('warning', 'check', 'robots-unknown-line', `Line ${u.line} is not a recognised directive: "${u.text.trim()}"`));
  const star = groups.find((g) => g.agents.includes('*'));
  if (star && blocksAll(star)) out.push(finding('error', 'check', 'robots-blocks-all', 'User-agent: * is disallowed from "/"; the whole site is blocked for compliant crawlers.'));
  if (sitemaps.length === 0) out.push(finding('warning', 'check', 'robots-no-sitemap', 'No Sitemap: directive.'));
  for (const s of sitemaps) {
    if (!isAbsoluteHttpUrl(s)) out.push(finding('error', 'check', 'robots-sitemap-relative', `Sitemap "${s}" must be an absolute URL.`));
  }
  for (const bot of AI_CRAWLERS) {
    const g = groups.find((gr) => gr.agents.some((a) => a.toLowerCase() === bot.toLowerCase()));
    if (g) out.push(finding('info', 'check', 'robots-ai-crawler', `${bot}: ${blocksAll(g) ? 'disallowed from /' : 'has a dedicated group'} (policy decision; not a ranking factor claim).`));
  }
  return out;
}

// -------------------------------------------------------------- sitemap

const W3C_DATE = /^\d{4}(-\d{2}(-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/;

export function checkSitemap(xml, { baseUrl } = {}) {
  const out = [];
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  if (!isIndex && !/<urlset[\s>]/i.test(xml)) {
    return [finding('error', 'check', 'sitemap-root', 'Document is neither a <urlset> nor a <sitemapindex>.')];
  }
  const entries = findElements(xml, isIndex ? 'sitemap' : 'url');
  if (entries.length === 0) out.push(finding('warning', 'check', 'sitemap-empty', 'Sitemap contains no entries.'));
  if (entries.length > 50_000) out.push(finding('error', 'check', 'sitemap-too-many', `Sitemap has ${entries.length} entries; the protocol limit is 50,000.`));
  if (Buffer.byteLength(xml, 'utf8') > 50 * 1024 * 1024) out.push(finding('error', 'check', 'sitemap-too-large', 'Sitemap exceeds 50 MB uncompressed.'));

  const seen = new Set();
  const hosts = new Set();
  let base = null;
  if (baseUrl) {
    try {
      base = new URL(baseUrl).host;
    } catch {
      out.push(finding('error', 'check', 'sitemap-base-url', `--base-url "${baseUrl}" is not a valid URL.`));
    }
  }
  entries.forEach((entry, i) => {
    const loc = textContent(findElements(entry.html, 'loc')[0]?.html ?? '');
    const lastmod = textContent(findElements(entry.html, 'lastmod')[0]?.html ?? '');
    if (!loc) {
      out.push(finding('error', 'check', 'sitemap-loc-missing', `Entry ${i + 1} has no <loc>.`));
      return;
    }
    if (!isAbsoluteHttpUrl(loc)) {
      out.push(finding('error', 'check', 'sitemap-loc-invalid', `Entry ${i + 1}: "${loc}" is not an absolute http(s) URL.`));
      return;
    }
    const host = new URL(loc).host;
    hosts.add(host);
    if (base && host !== base) out.push(finding('error', 'check', 'sitemap-foreign-host', `Entry ${i + 1}: ${loc} is not on ${base}.`));
    if (seen.has(loc)) out.push(finding('warning', 'check', 'sitemap-duplicate', `Duplicate URL: ${loc}`));
    seen.add(loc);
    if (lastmod && !W3C_DATE.test(lastmod)) out.push(finding('warning', 'check', 'sitemap-lastmod', `Entry ${i + 1}: lastmod "${lastmod}" is not a W3C datetime.`));
  });
  if (!base && hosts.size > 1) out.push(finding('warning', 'check', 'sitemap-mixed-hosts', `Sitemap mixes ${hosts.size} hosts: ${[...hosts].join(', ')}`));
  out.push(finding('info', 'check', 'sitemap-summary', `${isIndex ? 'Sitemap index' : 'URL set'} with ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}.`));
  return out;
}

// -------------------------------------------------------------- content

const QUESTION_RE = /^(who|what|when|where|why|how|which|can|does|do|is|are|should|will)\b|\?\s*$/i;

/**
 * Content-structure heuristics for answer engines (AEO/GEO). These are
 * signals that make content easier to extract and attribute. They are not
 * ranking factors and do not guarantee citations.
 */
export function checkContent(html) {
  const out = [];
  const body = /<body[\s>][\s\S]*<\/body\s*>/i.exec(html)?.[0] ?? html;
  const main = /<main[\s>][\s\S]*<\/main\s*>/i.exec(body)?.[0] ?? body;
  const words = wordCount(textContent(main));
  const h = (level, kind, rule, msg) => out.push(finding(level, kind, rule, msg));

  h('info', 'heuristic', 'content-words', `Main content has ~${words} words.`);
  if (words < 300) h('warning', 'heuristic', 'content-thin', 'Under 300 words; consider whether the page fully answers its topic.');

  // Walk headings in order and measure the first paragraph after each question heading.
  const tokens = [...main.matchAll(/<(h[2-4])[^>]*>([\s\S]*?)<\/\1\s*>|<p[^>]*>([\s\S]*?)<\/p\s*>/gi)];
  const questions = [];
  tokens.forEach((t, i) => {
    if (!t[1]) return;
    const heading = textContent(t[2]);
    if (!QUESTION_RE.test(heading)) return;
    const next = tokens[i + 1];
    const answerWords = next && !next[1] ? wordCount(textContent(next[3])) : 0;
    questions.push({ heading, answerWords });
  });
  if (questions.length === 0) {
    h('info', 'heuristic', 'content-no-questions', 'No question-style H2-H4 headings; Q&A structure helps answer extraction.');
  }
  for (const q of questions) {
    if (q.answerWords === 0) h('warning', 'heuristic', 'content-answer-missing', `"${q.heading}" is not followed directly by a paragraph answer.`);
    else if (q.answerWords > 60) h('info', 'heuristic', 'content-answer-long', `"${q.heading}": first answer paragraph is ${q.answerWords} words; a direct 40-60 word answer first is easier to quote.`);
  }

  if (!/<(ul|ol|table)[\s>]/i.test(main)) h('info', 'heuristic', 'content-no-lists', 'No lists or tables; structured formats are easier to extract.');

  const page = extractPage(html);
  const ld = page.jsonLd.join(' ');
  if (!page.author && !/"author"/.test(ld) && !/class=["'][^"']*\b(author|byline)\b/i.test(html)) {
    h('warning', 'heuristic', 'content-no-author', 'No author signal (meta author, JSON-LD author or byline).');
  }
  if (!/"date(Published|Modified)"/.test(ld) && !/<time[\s>]/i.test(html)) {
    h('warning', 'heuristic', 'content-no-date', 'No published/updated date signal (<time> or JSON-LD dates).');
  }
  const canonicalHost = (() => {
    try {
      return new URL(page.canonicals[0]).host;
    } catch {
      return null;
    }
  })();
  const external = page.anchors.filter((a) => {
    try {
      const u = new URL(a.href);
      return /^https?:$/.test(u.protocol) && (!canonicalHost || u.host !== canonicalHost);
    } catch {
      return false;
    }
  });
  if (external.length === 0) h('info', 'heuristic', 'content-no-citations', 'No outbound links to sources; citing primary sources supports credibility.');
  return out;
}
