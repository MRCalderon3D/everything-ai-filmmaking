#!/usr/bin/env node
'use strict';
/**
 * create-project.js — scaffold a production/ workspace in a target project.
 *
 * Creates the canonical directory layout (docs/conventions.md) and writes
 * production/project.yaml from templates/project.yaml with the title
 * substituted ({{TITLE}}, {{PROJECT_ID}}, {{DATE}} tokens; falls back to
 * setting the parsed YAML's title field, or to a minimal project.yaml when
 * no template exists yet).
 */

const path = require('path');
const fs = require('fs');
const { ROOT, exists, readText, writeFileEnsuring } = require('./lib/fsx');
const { parseArgs, helpIfRequested, fatal } = require('./lib/cli');
const yaml = require('./lib/yaml');

const HELP = `
create-project.js — scaffold production/ in a target film project.

Usage:
  node scripts/create-project.js --target <dir> --title "<film title>"

Options:
  --target <dir>   Project directory (production/ is created inside it).
  --title <text>   Film title (required).
  --force          Overwrite an existing production/project.yaml.
  --help           Show this help.
`;

const PRODUCTION_DIRS = [
  'story', 'characters', 'locations', 'props', 'scenes', 'shots',
  'references', 'prompts', 'generations', 'continuity', 'edit',
];

function slugifyId(title) {
  return String(title).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'UNTITLED';
}

function buildProjectYaml(title, templateText) {
  const today = new Date().toISOString().slice(0, 10);
  const projectId = slugifyId(title);
  if (templateText) {
    let text = templateText.replace(/\r\n/g, '\n');
    const hadTokens = /\{\{(TITLE|PROJECT_ID|DATE)\}\}/.test(text);
    text = text
      .replace(/\{\{TITLE\}\}/g, title)
      .replace(/\{\{PROJECT_ID\}\}/g, projectId)
      .replace(/\{\{DATE\}\}/g, today);
    if (!hadTokens) {
      // No tokens: substitute the title/created_at lines in place so the
      // template's comments survive.
      const quoted = JSON.stringify(title);
      if (/^title:.*$/m.test(text)) {
        text = text.replace(/^title:[^\n#]*(#.*)?$/m,
          (m, comment) => `title: ${quoted}${comment ? '          ' + comment : ''}`);
      } else {
        text = `title: ${quoted}\n${text}`;
      }
      text = text.replace(/^created_at:[^\n#]*(#.*)?$/m,
        (m, comment) => `created_at: "${new Date().toISOString()}"${comment ? ' ' + comment : ''}`);
    }
    return text;
  }
  // Minimal but schema-valid project.yaml (schemas/project.schema.json).
  return yaml.stringify({
    title,
    format: 'short',
    logline: 'TODO: one-sentence logline.',
    genre: 'drama',
    aspect_ratio: '16:9',
    fps: 24,
    resolution: '1920x1080',
    default_providers: { image: 'fal', video: 'veo', audio: 'elevenlabs' },
    created_at: new Date().toISOString(),
    version: '0.1.0',
  });
}

function main() {
  helpIfRequested(process.argv.slice(2), HELP);
  const { flags } = parseArgs();
  if (!flags.target || flags.target === true) fatal('--target <dir> is required (see --help)');
  if (!flags.title || flags.title === true) fatal('--title "<film title>" is required (see --help)');
  const target = path.resolve(String(flags.target));
  const title = String(flags.title);
  const prodDir = path.join(target, 'production');

  const projectFile = path.join(prodDir, 'project.yaml');
  if (exists(projectFile) && !flags.force) {
    fatal(`${projectFile} already exists (use --force to overwrite)`);
  }

  for (const dir of PRODUCTION_DIRS) {
    fs.mkdirSync(path.join(prodDir, dir), { recursive: true });
  }

  const templateCandidates = [
    path.join(ROOT, 'templates', 'project', 'project.yaml'),
    path.join(ROOT, 'templates', 'project.yaml'),
  ];
  const templateFile = templateCandidates.find(exists);
  const templateText = templateFile ? readText(templateFile) : null;
  writeFileEnsuring(projectFile, buildProjectYaml(title, templateText));

  console.log(`create-project: production/ scaffolded at ${prodDir}`);
  console.log(`  project.yaml written for "${title}"${templateText ? ' (from templates/project.yaml)' : ' (minimal, no template found)'}`);
  console.log('Next steps:');
  console.log('  1. Drop your script into production/story/ (script.fountain or treatment.md).');
  console.log('  2. Run /script-analyze, then /story-bible and /character-bible in your harness.');
  console.log('  3. node scripts/doctor.js --target "' + target + '" to verify the setup.');
}

module.exports = { buildProjectYaml, PRODUCTION_DIRS, slugifyId };

if (require.main === module) main();
