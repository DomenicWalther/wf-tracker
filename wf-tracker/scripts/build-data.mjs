/**
 * Merges the per-section source files in `wf-tracker/data/*.json` into the single
 * `public/assets/tracker-data.json` asset the app loads at runtime.
 *
 * The split files are the source of truth — edit those, not the generated asset.
 * Run via `npm run data:build` (also runs automatically on `prestart`/`prebuild`).
 *
 *   node scripts/build-data.mjs            # write the merged asset
 *   node scripts/build-data.mjs --check    # fail if the asset is stale (CI guard)
 *
 * Output is byte-identical to `JSON.stringify(merged, null, 2)`, so the committed
 * asset only changes when a source file actually changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '../data');
export const OUT_FILE = path.join(__dirname, '../public/assets/tracker-data.json');

/**
 * Canonical top-level key order of tracker-data.json. A section file MUST be
 * listed here to be included — keeps the merged output deterministic. When you
 * add a new section, add its key here and create `data/<key>.json`.
 */
export const SECTION_ORDER = [
  'atragraph', 'quests', 'gear', 'lichGear', 'incarnon', 'arcanes', 'mods',
  'subsume', 'railjack', 'relics', 'blueprints', 'items', 'cosmetics',
  'collectable', 'decorations', 'codex', 'market', 'extra', 'bigGoals',
  'versionLog', 'modularGear', 'settingsDefinitions', 'accolade',
];

export function buildMerged() {
  const onDisk = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace(/\.json$/, ''));

  const known = new Set(SECTION_ORDER);
  const missing = SECTION_ORDER.filter(k => !onDisk.includes(k));
  const extra = onDisk.filter(k => !known.has(k));
  if (missing.length) throw new Error(`Missing section file(s): ${missing.map(k => k + '.json').join(', ')}`);
  if (extra.length) throw new Error(`Unregistered section file(s) in data/: ${extra.map(k => k + '.json').join(', ')} — add the key to SECTION_ORDER in build-data.mjs`);

  const merged = {};
  for (const key of SECTION_ORDER) {
    const text = fs.readFileSync(path.join(DATA_DIR, `${key}.json`), 'utf8');
    try {
      merged[key] = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON in data/${key}.json: ${e.message}`);
    }
  }
  return JSON.stringify(merged, null, 2);
}

function main() {
  const check = process.argv.includes('--check');
  const next = buildMerged();
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;

  if (check) {
    if (current !== next) {
      console.error('✘ tracker-data.json is out of date — run `npm run data:build` and commit.');
      process.exit(1);
    }
    console.log('✓ tracker-data.json is up to date.');
    return;
  }

  if (current === next) {
    console.log('✓ tracker-data.json already up to date (no change).');
    return;
  }
  fs.writeFileSync(OUT_FILE, next);
  console.log(`✓ Wrote ${path.relative(process.cwd(), OUT_FILE)} from ${SECTION_ORDER.length} sections.`);
}

// Only run when invoked directly (so other scripts can import buildMerged).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
