'use strict';
/**
 * Minimal YAML subset parser/serializer for everything-ai-filmmaking.
 * Zero dependencies. CommonJS. Node >= 18.
 *
 * Supported subset (everything the scaffold's templates and production
 * artifacts use):
 *   - nested maps via 2+-space indentation
 *   - block lists ("- item"), including list items that are maps
 *     ("- key: value" with continuation lines aligned under the key)
 *   - scalars: strings, integers, floats, booleans, null (~, null, empty)
 *   - single- and double-quoted strings (double quotes support \\ \" \n \t)
 *   - inline flow collections: [a, b, c] and {k: v, k2: v2} (one level of
 *     nesting inside flow is supported recursively)
 *   - comments (# to end of line, quote-aware)
 *   - block scalars: | and > with optional "-" chomping indicator
 *   - a single leading "---" document marker
 *
 * NOT supported (documented limits):
 *   - anchors/aliases (&, *), tags (!!), merge keys (<<)
 *   - multiple documents per file
 *   - complex (non-scalar) mapping keys
 *   - tab indentation (throws)
 *   - flow collections spanning multiple lines
 *   - "+" chomping indicator and explicit indentation indicators on block
 *     scalars
 * Timestamps and version-like strings (e.g. 16:9) stay strings.
 */

function parseError(message, lineNo) {
  const err = new Error(`YAML parse error at line ${lineNo}: ${message}`);
  err.line = lineNo;
  return err;
}

/** Strip a trailing comment from a line, respecting quotes. */
function stripComment(text) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inDouble) {
      if (ch === '\\') i++;
      else if (ch === '"') inDouble = false;
    } else if (inSingle) {
      if (ch === "'") {
        if (text[i + 1] === "'") i++;
        else inSingle = false;
      }
    } else if (ch === '"') {
      inDouble = true;
    } else if (ch === "'") {
      inSingle = true;
    } else if (ch === '#') {
      if (i === 0 || text[i - 1] === ' ' || text[i - 1] === '\t') {
        return text.slice(0, i).replace(/[ \t]+$/, '');
      }
    }
  }
  return text.replace(/[ \t]+$/, '');
}

function preprocess(text) {
  const rawLines = String(text).split(/\r?\n/);
  const lines = [];
  for (let n = 0; n < rawLines.length; n++) {
    const raw = rawLines[n];
    const trimmed = raw.trim();
    const blank = trimmed === '';
    let indent = 0;
    let comment = false;
    if (!blank) {
      while (indent < raw.length && raw[indent] === ' ') indent++;
      if (raw[indent] === '\t') throw parseError('tab indentation is not supported', n + 1);
      comment = trimmed.startsWith('#');
    }
    lines.push({ raw, indent, blank, comment, lineNo: n + 1 });
  }
  return lines;
}

function nextContent(lines, idx) {
  // Full-line comments carry no structure; skip them like blanks.
  while (idx < lines.length && (lines[idx].blank || lines[idx].comment)) idx++;
  return idx;
}

function isListItem(line) {
  const c = line.raw.slice(line.indent);
  return c === '-' || c.startsWith('- ');
}

/** Parse an unquoted scalar string into a JS value. */
function parsePlainScalar(s) {
  if (s === '' || s === '~' || s === 'null' || s === 'Null' || s === 'NULL') return null;
  if (s === 'true' || s === 'True' || s === 'TRUE') return true;
  if (s === 'false' || s === 'False' || s === 'FALSE') return false;
  if (/^[+-]?\d+$/.test(s)) return parseInt(s, 10);
  if (/^[+-]?(\d+\.\d*|\.\d+)([eE][+-]?\d+)?$/.test(s) || /^[+-]?\d+[eE][+-]?\d+$/.test(s)) {
    return parseFloat(s);
  }
  return s;
}

function unquoteDouble(s, lineNo) {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') {
      const nx = s[++i];
      if (nx === 'n') out += '\n';
      else if (nx === 't') out += '\t';
      else if (nx === 'r') out += '\r';
      else if (nx === '"') out += '"';
      else if (nx === '\\') out += '\\';
      else if (nx === undefined) throw parseError('dangling escape in double-quoted string', lineNo);
      else out += nx;
    } else out += ch;
  }
  return out;
}

/** Parse a scalar or inline flow collection from trimmed text. */
function parseValueText(s, lineNo) {
  s = s.trim();
  if (s.startsWith('"')) {
    if (!s.endsWith('"') || s.length < 2) throw parseError('unterminated double-quoted string', lineNo);
    return unquoteDouble(s.slice(1, -1), lineNo);
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw parseError('unterminated single-quoted string', lineNo);
    return s.slice(1, -1).replace(/''/g, "'");
  }
  if (s.startsWith('[') || s.startsWith('{')) {
    const { value, rest } = parseFlow(s, lineNo);
    if (rest.trim() !== '') throw parseError(`unexpected trailing content after flow collection: "${rest}"`, lineNo);
    return value;
  }
  if (s.startsWith('&') || s.startsWith('*') || s.startsWith('!')) {
    throw parseError('anchors, aliases and tags are not supported by this YAML subset', lineNo);
  }
  return parsePlainScalar(s);
}

/** Recursive-descent parser for single-line flow collections. */
function parseFlow(s, lineNo) {
  s = s.trim();
  if (s.startsWith('[')) {
    const arr = [];
    let rest = s.slice(1).trim();
    if (rest.startsWith(']')) return { value: arr, rest: rest.slice(1) };
    for (;;) {
      const item = parseFlowItem(rest, lineNo, [',', ']']);
      arr.push(item.value);
      rest = item.rest.trim();
      if (rest.startsWith(',')) { rest = rest.slice(1).trim(); continue; }
      if (rest.startsWith(']')) return { value: arr, rest: rest.slice(1) };
      throw parseError('malformed flow sequence', lineNo);
    }
  }
  if (s.startsWith('{')) {
    const obj = {};
    let rest = s.slice(1).trim();
    if (rest.startsWith('}')) return { value: obj, rest: rest.slice(1) };
    for (;;) {
      const keyItem = parseFlowItem(rest, lineNo, [':']);
      rest = keyItem.rest.trim();
      if (!rest.startsWith(':')) throw parseError('expected ":" in flow mapping', lineNo);
      rest = rest.slice(1).trim();
      const valItem = parseFlowItem(rest, lineNo, [',', '}']);
      obj[String(keyItem.value)] = valItem.value;
      rest = valItem.rest.trim();
      if (rest.startsWith(',')) { rest = rest.slice(1).trim(); continue; }
      if (rest.startsWith('}')) return { value: obj, rest: rest.slice(1) };
      throw parseError('malformed flow mapping', lineNo);
    }
  }
  throw parseError('expected flow collection', lineNo);
}

function parseFlowItem(s, lineNo, stops) {
  s = s.replace(/^\s+/, '');
  if (s.startsWith('[') || s.startsWith('{')) return parseFlow(s, lineNo);
  if (s.startsWith('"')) {
    let i = 1;
    for (; i < s.length; i++) {
      if (s[i] === '\\') i++;
      else if (s[i] === '"') break;
    }
    if (i >= s.length) throw parseError('unterminated double-quoted string in flow', lineNo);
    return { value: unquoteDouble(s.slice(1, i), lineNo), rest: s.slice(i + 1) };
  }
  if (s.startsWith("'")) {
    let i = 1;
    for (; i < s.length; i++) {
      if (s[i] === "'") {
        if (s[i + 1] === "'") i++;
        else break;
      }
    }
    if (i >= s.length) throw parseError('unterminated single-quoted string in flow', lineNo);
    return { value: s.slice(1, i).replace(/''/g, "'"), rest: s.slice(i + 1) };
  }
  let i = 0;
  while (i < s.length && !stops.includes(s[i]) && s[i] !== ']' && s[i] !== '}') i++;
  return { value: parsePlainScalar(s.slice(0, i).trim()), rest: s.slice(i) };
}

/** Find the key/value separator in a map line. Returns {key, rest} or null. */
function splitKey(content, lineNo) {
  content = content.trim();
  let key = null;
  let afterKey;
  if (content.startsWith('"') || content.startsWith("'")) {
    const q = content[0];
    let i = 1;
    for (; i < content.length; i++) {
      if (q === '"' && content[i] === '\\') i++;
      else if (content[i] === q) {
        if (q === "'" && content[i + 1] === "'") { i++; continue; }
        break;
      }
    }
    if (i >= content.length) return null;
    key = q === '"' ? unquoteDouble(content.slice(1, i), lineNo) : content.slice(1, i).replace(/''/g, "'");
    afterKey = content.slice(i + 1).trim();
    if (!afterKey.startsWith(':')) return null;
    return { key, rest: afterKey.slice(1).trim() };
  }
  for (let i = 0; i < content.length; i++) {
    if (content[i] === ':') {
      const nx = content[i + 1];
      if (nx === undefined || nx === ' ') {
        return { key: content.slice(0, i).trim(), rest: content.slice(i + 1).trim() };
      }
    }
  }
  return null;
}

function collectBlockScalar(lines, idx, parentIndent, indicator, lineNo) {
  const fold = indicator[0] === '>';
  const chompStrip = indicator.includes('-');
  const body = [];
  let blockIndent = -1;
  let i = idx;
  const pending = [];
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.blank) { pending.push(''); i++; continue; }
    if (ln.indent <= parentIndent) break;
    if (blockIndent === -1) blockIndent = ln.indent;
    if (ln.indent < blockIndent) break;
    for (const p of pending) body.push(p);
    pending.length = 0;
    body.push(ln.raw.slice(blockIndent));
    i++;
  }
  if (blockIndent === -1 && body.length === 0) {
    return { value: '', next: i };
  }
  let text;
  if (fold) {
    let out = '';
    let prevBlank = true;
    for (const seg of body) {
      if (seg === '') { out += '\n'; prevBlank = true; }
      else { out += (prevBlank ? '' : ' ') + seg; prevBlank = false; }
    }
    text = out;
  } else {
    text = body.join('\n');
  }
  if (!chompStrip) text += '\n';
  else text = text.replace(/\n+$/, '');
  return { value: text, next: i };
}

/** Parse the value that follows a key (or dash) with empty inline content. */
function parseNested(lines, idx, parentIndent, allowSameIndentList) {
  const j = nextContent(lines, idx);
  if (j >= lines.length) return { value: null, next: j };
  const ln = lines[j];
  if (ln.indent > parentIndent) {
    return isListItem(ln) ? parseList(lines, j, ln.indent) : parseMap(lines, j, ln.indent);
  }
  if (allowSameIndentList && ln.indent === parentIndent && isListItem(ln)) {
    return parseList(lines, j, ln.indent);
  }
  return { value: null, next: idx };
}

function parseMap(lines, idx, indent) {
  const obj = {};
  let i = idx;
  while (i < lines.length) {
    i = nextContent(lines, i);
    if (i >= lines.length) break;
    const ln = lines[i];
    if (ln.indent < indent) break;
    if (ln.indent > indent) throw parseError(`unexpected indentation (expected ${indent} spaces)`, ln.lineNo);
    if (isListItem(ln)) break;
    const content = stripComment(ln.raw.slice(ln.indent));
    if (content === '') { i++; continue; }
    if (content === '---' || content === '...') break; // document boundary
    const kv = splitKey(content, ln.lineNo);
    if (!kv) throw parseError(`expected "key: value", got "${content}"`, ln.lineNo);
    if (Object.prototype.hasOwnProperty.call(obj, kv.key)) {
      throw parseError(`duplicate key "${kv.key}"`, ln.lineNo);
    }
    if (kv.rest === '') {
      const nested = parseNested(lines, i + 1, indent, true);
      obj[kv.key] = nested.value;
      i = nested.value === null ? i + 1 : nested.next;
    } else if (/^[|>]-?$/.test(kv.rest)) {
      const blk = collectBlockScalar(lines, i + 1, indent, kv.rest, ln.lineNo);
      obj[kv.key] = blk.value;
      i = blk.next;
    } else {
      obj[kv.key] = parseValueText(kv.rest, ln.lineNo);
      i++;
    }
  }
  return { value: obj, next: i };
}

function parseList(lines, idx, indent) {
  const arr = [];
  let i = idx;
  while (i < lines.length) {
    i = nextContent(lines, i);
    if (i >= lines.length) break;
    const ln = lines[i];
    if (ln.indent !== indent || !isListItem(ln)) break;
    const full = stripComment(ln.raw.slice(ln.indent));
    const rest = full === '-' ? '' : full.slice(2).trim();
    if (rest === '') {
      const nested = parseNested(lines, i + 1, indent, false);
      arr.push(nested.value);
      i = nested.value === null ? i + 1 : nested.next;
    } else if (/^[|>]-?$/.test(rest)) {
      const blk = collectBlockScalar(lines, i + 1, indent, rest, ln.lineNo);
      arr.push(blk.value);
      i = blk.next;
    } else if (splitKey(rest, ln.lineNo) && !rest.startsWith('[') && !rest.startsWith('{') &&
               !rest.startsWith('"') && !rest.startsWith("'")) {
      // "- key: value" — a map inside a list item. Child keys align with the
      // first key, i.e. at the dash indent + offset of the key text.
      const childIndent = ln.indent + (full.length - rest.length);
      const saved = lines[i];
      lines[i] = { raw: ' '.repeat(childIndent) + rest, indent: childIndent, blank: false, lineNo: ln.lineNo };
      const nested = parseMap(lines, i, childIndent);
      lines[i] = saved;
      arr.push(nested.value);
      i = nested.next;
    } else {
      arr.push(parseValueText(rest, ln.lineNo));
      i++;
    }
  }
  return { value: arr, next: i };
}

function parse(text) {
  const lines = preprocess(text);
  let i = nextContent(lines, 0);
  if (i < lines.length && stripComment(lines[i].raw.trim()) === '---') i++;
  i = nextContent(lines, i);
  if (i >= lines.length) return null;
  const first = lines[i];
  const result = isListItem(first)
    ? parseList(lines, i, first.indent)
    : parseMap(lines, i, first.indent);
  const trailing = nextContent(lines, result.next);
  if (trailing < lines.length && stripComment(lines[trailing].raw.trim()) !== '...') {
    throw parseError('content after end of document (multiple documents are not supported)', lines[trailing].lineNo);
  }
  return result.value;
}

// ---------------------------------------------------------------------------
// stringify
// ---------------------------------------------------------------------------

const PLAIN_KEY_RE = /^[A-Za-z0-9_][A-Za-z0-9_.\/-]*$/;

function needsQuoting(s) {
  if (s === '') return true;
  if (/^[\s]|[\s]$/.test(s)) return true;
  if (/[\n\t\r]/.test(s)) return true;
  if (/^[-?:#&*!|>'"%@`{}[\],]/.test(s)) return true;
  if (/: /.test(s) || /:$/.test(s) || / #/.test(s)) return true;
  if (/[{}[\],]/.test(s)) return true;
  if (s !== s.trim()) return true;
  const parsed = parsePlainScalar(s);
  if (typeof parsed !== 'string') return true;
  return false;
}

function quoteString(s) {
  return '"' + s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t') + '"';
}

function scalarToText(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!isFinite(v)) throw new Error('cannot serialize non-finite number');
    return String(v);
  }
  const s = String(v);
  return needsQuoting(s) ? quoteString(s) : s;
}

function keyToText(k) {
  return PLAIN_KEY_RE.test(k) ? k : quoteString(k);
}

function isScalar(v) {
  return v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v);
}

function stringifyNode(value, indent, out) {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (value.length === 0) { out.push(pad + '[]'); return; }
    for (const item of value) {
      if (isScalar(item)) {
        out.push(pad + '- ' + scalarToText(item));
      } else if (Array.isArray(item)) {
        out.push(pad + '-');
        stringifyNode(item, indent + 2, out);
      } else {
        const keys = Object.keys(item);
        if (keys.length === 0) { out.push(pad + '- {}'); continue; }
        let first = true;
        for (const k of keys) {
          const v = item[k];
          const prefix = first ? pad + '- ' : pad + '  ';
          first = false;
          if (isScalar(v)) {
            out.push(prefix + keyToText(k) + ': ' + scalarToText(v));
          } else if ((Array.isArray(v) && v.length === 0)) {
            out.push(prefix + keyToText(k) + ': []');
          } else if (!Array.isArray(v) && Object.keys(v).length === 0) {
            out.push(prefix + keyToText(k) + ': {}');
          } else {
            out.push(prefix + keyToText(k) + ':');
            stringifyNode(v, indent + 4, out);
          }
        }
      }
    }
    return;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) { out.push(pad + '{}'); return; }
  for (const k of keys) {
    const v = value[k];
    if (isScalar(v)) {
      out.push(pad + keyToText(k) + ': ' + scalarToText(v));
    } else if (Array.isArray(v) && v.length === 0) {
      out.push(pad + keyToText(k) + ': []');
    } else if (!Array.isArray(v) && Object.keys(v).length === 0) {
      out.push(pad + keyToText(k) + ': {}');
    } else {
      out.push(pad + keyToText(k) + ':');
      stringifyNode(v, indent + 2, out);
    }
  }
}

/**
 * Serialize a JS value to YAML (subset). Top level must be a map or array.
 * Output uses 2-space indentation, LF line endings and a trailing newline.
 */
function stringify(value) {
  if (isScalar(value)) return scalarToText(value) + '\n';
  const out = [];
  stringifyNode(value, 0, out);
  return out.join('\n') + '\n';
}

module.exports = { parse, stringify };
