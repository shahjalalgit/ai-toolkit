// Minimal, dependency-free HTML extraction for SEO checks.
// This is not a full HTML parser: it handles well-formed documents and the
// common tags SEO checks need. Malformed markup may produce false findings.

const ATTR_RE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;

export function parseAttributes(tagSource) {
  const attrs = {};
  const inner = tagSource.replace(/^<\s*[a-zA-Z0-9-]+/, '').replace(/\/?>$/, '');
  for (const m of inner.matchAll(ATTR_RE)) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return attrs;
}

export function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function stripComments(html) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/** Returns attribute maps for every opening tag with the given name. */
export function findTags(html, name) {
  const re = new RegExp(`<${name}(?=[\\s/>])[^>]*>`, 'gi');
  return [...stripComments(html).matchAll(re)].map((m) => parseAttributes(m[0]));
}

/** Returns {attrs, text} for every element with the given name. */
export function findElements(html, name) {
  const re = new RegExp(`<${name}(?=[\\s>])[^>]*>([\\s\\S]*?)</${name}\\s*>`, 'gi');
  return [...stripComments(html).matchAll(re)].map((m) => ({
    attrs: parseAttributes(m[0].slice(0, m[0].indexOf('>') + 1)),
    html: m[1],
    text: textContent(m[1]),
  }));
}

export function textContent(html) {
  return decodeEntities(
    stripComments(html)
      .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

export function wordCount(text) {
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

/** Extracts a structured view of the document used by the checks. */
export function extractPage(html) {
  const head = /<head[\s>][\s\S]*?<\/head\s*>/i.exec(html)?.[0] ?? '';
  const meta = findTags(html, 'meta');
  const metaByName = (n) => meta.find((m) => (m.name ?? '').toLowerCase() === n)?.content;
  const links = findTags(html, 'link');
  return {
    lang: findTags(html, 'html')[0]?.lang,
    titles: findElements(html, 'title').map((t) => t.text),
    description: metaByName('description'),
    robots: metaByName('robots'),
    viewport: metaByName('viewport'),
    author: metaByName('author'),
    canonicals: links.filter((l) => (l.rel ?? '').toLowerCase().split(/\s+/).includes('canonical')).map((l) => l.href ?? ''),
    h1: findElements(html, 'h1').map((h) => h.text),
    images: findTags(html, 'img'),
    anchors: findTags(html, 'a'),
    jsonLd: findElements(html, 'script')
      .filter((s) => (s.attrs.type ?? '').toLowerCase() === 'application/ld+json')
      .map((s) => s.html),
    headScripts: findTags(head, 'script'),
    bytes: Buffer.byteLength(html, 'utf8'),
  };
}
