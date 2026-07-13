'use strict';
/** Markdown frontmatter helpers (YAML frontmatter via lib/yaml). */

const yaml = require('./yaml');

/**
 * Split a markdown document into { frontmatter, body, raw }.
 * frontmatter is null when absent; throws when the YAML is invalid.
 */
function parseFrontmatter(text) {
  const src = String(text).replace(/\r\n/g, '\n');
  if (!src.startsWith('---\n')) return { frontmatter: null, body: src };
  const end = src.indexOf('\n---', 4);
  if (end === -1) throw new Error('unterminated frontmatter block');
  const fmText = src.slice(4, end);
  const after = src.indexOf('\n', end + 1);
  const body = after === -1 ? '' : src.slice(after + 1);
  const frontmatter = yaml.parse(fmText);
  if (frontmatter !== null && (typeof frontmatter !== 'object' || Array.isArray(frontmatter))) {
    throw new Error('frontmatter must be a YAML map');
  }
  return { frontmatter, body };
}

/** List the "## Section" headings present in a markdown body. */
function sectionHeadings(body) {
  const out = [];
  for (const line of String(body).split('\n')) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) out.push(m[1]);
  }
  return out;
}

/**
 * Extract the bulleted list items under a "## <name>" heading (until the
 * next heading). Bullets may be "- name", "- `name`", or "- **name** — ...".
 */
function sectionBullets(body, name) {
  const lines = String(body).split('\n');
  const items = [];
  let inSection = false;
  for (const line of lines) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) {
      if (inSection) break;
      inSection = h[1].trim().toLowerCase() === name.toLowerCase();
      continue;
    }
    if (!inSection) continue;
    const b = line.match(/^\s*[-*]\s+(.+)$/);
    if (b) {
      let item = b[1].trim();
      item = item.replace(/^`([^`]+)`.*$/, '$1');
      item = item.replace(/^\*\*([^*]+)\*\*.*$/, '$1');
      // keep only the leading token (name) if followed by prose separators
      const m = item.match(/^([a-z0-9-]+)\b/i);
      if (m) item = m[1];
      items.push(item.trim());
    }
  }
  return items;
}

/** Serialize a frontmatter object + body back to markdown. */
function withFrontmatter(frontmatter, body) {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return body;
  return `---\n${yaml.stringify(frontmatter)}---\n${body}`;
}

module.exports = { parseFrontmatter, sectionHeadings, sectionBullets, withFrontmatter };
