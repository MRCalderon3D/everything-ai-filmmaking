#!/usr/bin/env node
'use strict';
/**
 * build-board.js — compose a one-page visual production board for a scene.
 *
 * Reads REAL project artifacts (project.yaml, scene shots, blocking.yaml,
 * the location's map.yaml, approved masters in production/references/, and
 * approved keyframes from generation records) and writes a self-contained
 * board.html: character strip, environment strip, a data-faithful blocking
 * floor plan drawn as inline SVG from map coordinates (meters), and the
 * storyboard grid with captions. Nothing is generated — this is faithful
 * composition of what exists. Missing assets degrade to labeled
 * placeholders; the script never fails on absent media.
 */

const path = require('path');
const fs = require('fs');
const { exists, readText } = require('./lib/fsx');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');
const yaml = require('./lib/yaml');

const HELP = `
build-board.js — one-page visual production board per scene.

Usage:
  node scripts/build-board.js --scene-dir production/scenes/SC_001 [--out <file>]

Options:
  --scene-dir <dir>  Scene directory (contains scene.yaml, shots/, blocking.yaml).
  --out <file>       Output HTML (default: <scene-dir>/storyboard/board.html).
  --help             Show this help.

Composes ONLY existing approved material; missing pieces render as labeled
placeholders. Output is self-contained HTML with relative image paths.
`;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function safeYaml(file) {
  try { return exists(file) ? yaml.parse(readText(file)) : null; }
  catch (err) { console.warn(`warning: unparseable ${file}: ${err.message}`); return null; }
}

function findProductionRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i++) {
    if (path.basename(dir) === 'production' || exists(path.join(dir, 'project.yaml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Newest approved/succeeded generation media for a shot-or-asset scope. */
function approvedMedia(prodRoot, scope, preferSubstr) {
  const dir = path.join(prodRoot, 'generations', scope);
  if (!exists(dir)) return null;
  let best = null;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.ya?ml$/i.test(f)) continue;
    const rec = safeYaml(path.join(dir, f));
    if (!rec || !['approved', 'succeeded'].includes(rec.status)) continue;
    for (const m of rec.media_files || []) {
      const base = path.basename(String(m));
      const file = path.join(dir, base);
      if (!exists(file)) continue;
      const score = (preferSubstr && base.toLowerCase().includes(preferSubstr) ? 2 : 0) +
        (rec.status === 'approved' ? 1 : 0);
      if (!best || score >= best.score) best = { file, score };
    }
  }
  return best ? best.file : null;
}

/** All canonical reference images whose basename starts with a prefix. */
function referenceImages(prodRoot, prefix) {
  const dir = path.join(prodRoot, 'references');
  if (!exists(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && f.toUpperCase().startsWith(prefix.toUpperCase()))
    .sort()
    .map((f) => path.join(dir, f));
}

function rel(fromDir, file) {
  return path.relative(fromDir, file).split(path.sep).join('/');
}

function imgOrPlaceholder(outDir, file, label, cls) {
  if (file && exists(file)) {
    return `<figure class="${cls}"><img src="${esc(rel(outDir, file))}" alt="${esc(label)}"><figcaption>${esc(label)}</figcaption></figure>`;
  }
  return `<figure class="${cls} missing"><div class="ph">${esc(label)}<br><span>not generated yet</span></div><figcaption>${esc(label)}</figcaption></figure>`;
}

/** Data-faithful floor plan SVG from map.yaml (+ shot path by station). */
function renderPlanSvg(map, shots) {
  if (!map || !Array.isArray(map.landmarks) || !map.landmarks.length) {
    return '<p class="note">No map.yaml with coordinates — floor plan unavailable.</p>';
  }
  const pts = [];
  for (const l of map.landmarks) if (l.position) pts.push(l.position);
  for (const c of map.camera_stations || []) if (c.position) pts.push(c.position);
  if (!pts.length) return '<p class="note">Map has no numeric positions.</p>';
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const pad = 3;
  const minX = Math.min(...xs) - pad, maxX = Math.max(...xs) + pad;
  const minY = Math.min(...ys) - pad, maxY = Math.max(...ys) + pad;
  const W = 640, H = 420;
  const sx = W / (maxX - minX), sy = H / (maxY - minY);
  const s = Math.min(sx, sy);
  // +y on the map runs "up" the board: flip y.
  const X = (x) => ((x - minX) * s).toFixed(1);
  const Y = (y) => (H - (y - minY) * s).toFixed(1);
  const out = [];
  out.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="blocking floor plan">`);
  out.push(`<rect width="${W}" height="${H}" fill="#10141a"/>`);
  // landmarks
  for (const l of map.landmarks) {
    if (!l.position) continue;
    out.push(`<rect x="${X(l.position.x) - 5}" y="${Y(l.position.y) - 5}" width="10" height="10" fill="#d8b24a"/>`);
    out.push(`<text x="${+X(l.position.x) + 9}" y="${+Y(l.position.y) + 4}" fill="#d8b24a" font-size="11">${esc(l.name)}</text>`);
  }
  // stations
  const stationPos = {};
  for (const c of map.camera_stations || []) {
    if (!c.position) continue;
    stationPos[c.id] = c.position;
    const hx = +X(c.position.x), hy = +Y(c.position.y);
    out.push(`<circle cx="${hx}" cy="${hy}" r="6" fill="none" stroke="#5fb3ff" stroke-width="2"/>`);
    const head = ((c.orientation && c.orientation.heading_deg) || 0) * Math.PI / 180;
    // heading 0 = +y (map convention: along the route); draw a short view ray.
    out.push(`<line x1="${hx}" y1="${hy}" x2="${(hx + Math.sin(head) * 16).toFixed(1)}" y2="${(hy - Math.cos(head) * 16).toFixed(1)}" stroke="#5fb3ff" stroke-width="1.5"/>`);
    out.push(`<text x="${hx + 8}" y="${hy - 8}" fill="#5fb3ff" font-size="10">${esc(c.id.replace(/^.*_C/, 'C'))}</text>`);
  }
  // shot path: consecutive shots connected through their stations
  let prev = null, n = 0;
  for (const shot of shots) {
    n++;
    const st = shot.camera && shot.camera.station && stationPos[shot.camera.station];
    if (!st) { prev = null; continue; }
    const hx = +X(st.x), hy = +Y(st.y);
    if (prev) out.push(`<line x1="${prev[0]}" y1="${prev[1]}" x2="${hx}" y2="${hy}" stroke="#e5484d" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    out.push(`<circle cx="${hx}" cy="${hy}" r="9" fill="#e5484d"/>`);
    out.push(`<text x="${hx}" y="${hy + 3.5}" fill="#fff" font-size="10" text-anchor="middle">${n}</text>`);
    prev = [hx, hy];
  }
  out.push(`<text x="8" y="${H - 8}" fill="#8b949e" font-size="10">origin: ${esc(map.origin || 'unspecified')} · meters</text>`);
  out.push('</svg>');
  return out.join('');
}

function cameraLine(shot) {
  const c = shot.camera || {};
  const m = c.movement || {};
  const bits = [c.shot_size, c.angle, c.lens_mm ? `${c.lens_mm}mm` : null,
    m.type ? `${m.type}${m.motivation ? ` (${m.motivation})` : ''}` : null];
  return bits.filter(Boolean).join(' · ');
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  if (!flags['scene-dir'] || flags['scene-dir'] === true) fatal('--scene-dir is required (see --help)');
  const sceneDir = path.resolve(String(flags['scene-dir']));
  if (!exists(sceneDir)) fatal(`scene dir not found: ${sceneDir}`);
  const prodRoot = findProductionRoot(sceneDir);
  if (!prodRoot) fatal('could not locate the production/ root above the scene dir');

  const project = safeYaml(path.join(prodRoot, 'project.yaml')) || {};
  const scene = safeYaml(path.join(sceneDir, 'scene.yaml')) || {};
  const blocking = safeYaml(path.join(sceneDir, 'blocking.yaml')) || {};
  const shotsDir = path.join(sceneDir, 'shots');
  const shots = exists(shotsDir)
    ? fs.readdirSync(shotsDir).filter((f) => /^SH_.*\.ya?ml$/i.test(f)).sort()
      .map((f) => safeYaml(path.join(shotsDir, f))).filter(Boolean)
    : [];
  if (!shots.length) console.warn('warning: no shot files found — storyboard grid will be empty');

  // Location: from scene.yaml, first shot station prefix, or map discovery.
  let locId = scene.location || null;
  if (!locId) {
    const st = shots.map((s) => s.camera && s.camera.station).find(Boolean);
    if (st) locId = String(st).replace(/_C\d+$/, '');
  }
  const map = locId ? safeYaml(path.join(prodRoot, 'locations', locId, 'map.yaml')) : null;

  // Characters present in the scene (blocking handles + shot performance keys).
  const handles = new Set();
  for (const s of shots) {
    for (const h of Object.keys((s.blocking && s.blocking.character_positions) || {})) handles.add(h);
    for (const h of Object.keys(s.performance || {})) handles.add(h);
  }
  const charIds = [];
  const charsDir = path.join(prodRoot, 'characters');
  if (exists(charsDir)) {
    for (const d of fs.readdirSync(charsDir)) {
      const short = d.replace(/^CHAR_/, '').toLowerCase();
      if ([...handles].some((h) => short.startsWith(h) || h.startsWith(short.split('_')[0]))) charIds.push(d);
    }
    if (!charIds.length) charIds.push(...fs.readdirSync(charsDir).filter((d) => d.startsWith('CHAR_')));
  }

  const outFile = flags.out && flags.out !== true
    ? path.resolve(String(flags.out))
    : path.join(sceneDir, 'storyboard', 'board.html');
  const outDir = path.dirname(outFile);
  fs.mkdirSync(outDir, { recursive: true });

  const charStrip = charIds.map((id) => {
    const imgs = referenceImages(prodRoot, id + '_');
    const bible = safeYaml(path.join(prodRoot, 'characters', id, 'character.yaml')) || {};
    const cap = `${id}${bible.name ? ` — ${bible.name}` : ''}`;
    if (!imgs.length) return imgOrPlaceholder(outDir, null, cap, 'char');
    return imgs.map((f) => imgOrPlaceholder(outDir, f, `${id.replace(/^CHAR_/, '')}: ${path.basename(f).replace(/\.[a-z]+$/i, '').replace(id + '_', '')}`, 'char')).join('');
  }).join('');

  const envStrip = locId
    ? referenceImages(prodRoot, locId).map((f) =>
      imgOrPlaceholder(outDir, f, path.basename(f).replace(/\.[a-z]+$/i, ''), 'env')).join('') ||
      imgOrPlaceholder(outDir, null, locId, 'env')
    : '<p class="note">No location resolved for this scene.</p>';

  const panels = shots.map((s, i) => {
    const kf = approvedMedia(prodRoot, s.id, 'start');
    const t = s.timing || {};
    const cap = [
      `<b>${esc(s.id)}</b> · ${esc(t.duration_seconds != null ? t.duration_seconds + 's' : '?')}` +
      (t.handles_before || t.handles_after ? ` <span class="dim">(+${t.handles_before || 0}/+${t.handles_after || 0} handles)</span>` : ''),
      esc(cameraLine(s)),
      esc((s.narrative && s.narrative.purpose) || ''),
    ].filter(Boolean).join('<br>');
    const fig = kf
      ? `<img src="${esc(rel(outDir, kf))}" alt="${esc(s.id)}">`
      : `<div class="ph">${esc(s.id)}<br><span>keyframe pending</span></div>`;
    return `<div class="panel"><div class="num">${i + 1}</div>${fig}<div class="cap">${cap}</div></div>`;
  }).join('');

  const kit = project.lens_kit || {};
  const header = [
    `<h1>${esc(project.title || 'Untitled')} — ${esc(scene.id || path.basename(sceneDir))}</h1>`,
    `<p class="meta">${esc(project.production_type || 'cinema')} · ${esc(project.format || '')} · ${esc(project.aspect_ratio || '')} @ ${esc(project.fps || '')}fps` +
    (kit.focal_lengths_mm ? ` · lens kit ${esc(kit.focal_lengths_mm.join('/'))}mm ${esc(kit.lens_type || '')}` : '') +
    (scene.time_of_day ? ` · ${esc(scene.time_of_day)}` : '') + `</p>`,
    scene.synopsis ? `<p class="syn">${esc(scene.synopsis)}</p>` : '',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(project.title || 'Board')} — ${esc(scene.id || '')} production board</title>
<style>
  :root { color-scheme: dark; }
  body { background:#0b0e12; color:#e6e8eb; font:14px/1.45 system-ui, sans-serif; margin:24px; }
  h1 { margin:0 0 2px; font-size:22px; } h2 { font-size:13px; text-transform:uppercase; letter-spacing:.12em; color:#8b949e; border-bottom:1px solid #2a2f36; padding-bottom:4px; margin:26px 0 10px; }
  .meta { color:#8b949e; margin:0 0 4px; } .syn { max-width:70em; color:#c7cbd1; margin:4px 0 0; }
  .strip { display:flex; flex-wrap:wrap; gap:10px; }
  figure { margin:0; } figure img { height:150px; display:block; border-radius:4px; }
  figure.env img { height:120px; } figcaption { font-size:11px; color:#8b949e; max-width:160px; padding-top:3px; }
  .ph { display:flex; flex-direction:column; align-items:center; justify-content:center; width:110px; height:150px; background:#161b22; border:1px dashed #3a4048; border-radius:4px; color:#8b949e; font-size:11px; text-align:center; padding:6px; }
  .ph span { color:#556; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:14px; }
  .panel { background:#11151b; border:1px solid #232930; border-radius:6px; overflow:hidden; position:relative; }
  .panel img { width:100%; display:block; } .panel .ph { width:100%; height:180px; }
  .panel .num { position:absolute; top:6px; left:6px; background:#e5484d; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; }
  .panel .cap { padding:8px 10px; font-size:12px; color:#c7cbd1; } .dim { color:#8b949e; }
  .cols { display:grid; grid-template-columns: minmax(320px,660px) 1fr; gap:20px; align-items:start; }
  .note { color:#8b949e; } svg { width:100%; height:auto; border-radius:6px; }
  @media print { body { background:#fff; color:#000; } }
</style></head><body>
${header}
<h2>Character reference</h2><div class="strip">${charStrip || '<p class="note">No characters resolved.</p>'}</div>
<h2>Environment / set</h2><div class="strip">${envStrip}</div>
<div class="cols"><div>
<h2>Blocking floor plan</h2>${renderPlanSvg(map, shots)}
</div><div>
<h2>Route & stations</h2>
<ol class="note">${shots.map((s) => `<li>${esc(s.id)} — ${esc((s.camera && s.camera.station) || 'no station')}</li>`).join('')}</ol>
</div></div>
<h2>Storyboard sequence</h2><div class="grid">${panels || '<p class="note">No shots.</p>'}</div>
<p class="note">Composed from approved project assets by scripts/build-board.js — nothing on this page is invented.</p>
</body></html>`;

  fs.writeFileSync(outFile, html);
  console.log(`build-board: wrote ${outFile}`);
  console.log(`  ${shots.length} shot panel(s), ${charIds.length} character(s), location ${locId || 'n/a'}`);
}

try { main(); } catch (err) {
  console.error(`build-board: ${err.message}`);
  process.exit(1);
}
