'use strict';
/** build-board.js composes a board from a synthetic scene and degrades
 * gracefully on missing media. */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eaf-board-'));
const prod = path.join(tmp, 'production');
const scene = path.join(prod, 'scenes', 'SC_004');

function write(rel, content) {
  const file = path.join(prod, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// Minimal synthetic production from the shipped templates.
fs.mkdirSync(scene, { recursive: true });
write('project.yaml', fs.readFileSync(path.join(ROOT, 'templates', 'project', 'project.yaml')));
write(path.join('locations', 'LOC_STATION', 'map.yaml'),
  fs.readFileSync(path.join(ROOT, 'templates', 'location', 'map.yaml')));
write(path.join('scenes', 'SC_004', 'scene.yaml'),
  'id: SC_004\nlocation: LOC_STATION\nsynopsis: "Test scene."\n');
write(path.join('scenes', 'SC_004', 'shots', 'SH_004_002.yaml'),
  fs.readFileSync(path.join(ROOT, 'templates', 'shot', 'shot.yaml')));
// One approved generation with a tiny PNG; one shot left pending.
const png1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64');
write(path.join('generations', 'SH_004_002', 'sh_004_002_start.png'), png1x1);
write(path.join('generations', 'SH_004_002', 'GEN_SH_004_002_01.yaml'), [
  'id: GEN_SH_004_002_01', 'shot: SH_004_002', 'provider: harness-native',
  'model: gpt-image', 'kind: image', 'prompt_package: PP_SH_004_002_HARNESS-NATIVE',
  'media_files:', '  - sh_004_002_start.png',
  'cost: { currency: USD, amount: 0, estimated: false }',
  'status: approved', 'created_at: "2026-07-15T00:00:00Z"', ''].join('\n'));
// A second shot with no media at all (placeholder path).
write(path.join('scenes', 'SC_004', 'shots', 'SH_004_003.yaml'),
  fs.readFileSync(path.join(ROOT, 'templates', 'shot', 'shot.yaml'))
    .toString().replace(/SH_004_002/g, 'SH_004_003').replace('order: 2', 'order: 3'));

execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-board.js'),
  '--scene-dir', scene], { stdio: 'pipe' });

const boardFile = path.join(scene, 'storyboard', 'board.html');
assert.ok(fs.existsSync(boardFile), 'board.html must exist');
const html = fs.readFileSync(boardFile, 'utf8');
assert.ok(html.includes('SH_004_002'), 'board lists the shot id');
assert.ok(html.includes('<svg'), 'board includes the floor-plan SVG');
assert.ok(html.includes('sh_004_002_start.png'), 'approved keyframe referenced');
assert.ok(html.includes('keyframe pending'), 'missing keyframe degrades to placeholder');
assert.ok(!/[A-Z]:\\/.test(html), 'no absolute Windows paths leak into the board');

fs.rmSync(tmp, { recursive: true, force: true });
console.log('build-board: OK');
