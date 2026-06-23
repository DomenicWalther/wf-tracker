/**
 * Sync script: fetches latest Warframe item data from WFCD/warframe-items
 * and adds any new gear entries.
 *
 * Writes to the split source file `wf-tracker/data/gear.json`, then regenerates
 * the merged `tracker-data.json` asset, so the change survives the next build.
 *
 * Usage:
 *   node scripts/sync-warframe-data.mjs            # apply changes
 *   node scripts/sync-warframe-data.mjs --dry-run  # preview only, no writes
 *
 * Source: https://github.com/WFCD/warframe-items
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildMerged, OUT_FILE } from '../wf-tracker/scripts/build-data.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEAR_FILE = path.join(__dirname, '../wf-tracker/data/gear.json');
const DRY_RUN = process.argv.includes('--dry-run');
const WFCD_BASE = 'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// Zaw strike/grip/link names — modular components, not standalone weapons.
// WFCD includes them in Melee.json but they shouldn't be individual tracker entries.
const ZAW_COMPONENT_PATTERNS = [
  /^(Ekwana|Jai|Ruhang|Vargeet|Seekalla|Korb|Kwath|Laka|Peye|Jayap|Shtung|Kroostra|Tonkkatt|Plague\s)/i,
];

// Kitgun chamber/grip/loader names in WFCD Secondary.json
const KITGUN_COMPONENT_PATTERNS = [
  /^(Rattleguts|Tombfinger|Catchmoon|Gaze|Pax\s|Gibber|Lobosk|Splat|Shock\s)/i,
];

// Internal/modular weapon designations — not collectible items
const INTERNAL_WEAPON_PATTERNS = [
  /^Efv-/i,   // internal Railjack/modular weapons
  /^Purgator\s/i,
];

// Known non-playable items that appear in WFCD's Warframes.json
const WARFRAME_EXCLUSIONS = new Set([
  'Helminth', 'Bonewidow', 'Voidrig', // Necramechs / system entries
]);

function isZawComponent(name) {
  return ZAW_COMPONENT_PATTERNS.some(re => re.test(name));
}

function isKitgunComponent(name) {
  return KITGUN_COMPONENT_PATTERNS.some(re => re.test(name));
}

async function syncWarframes(gear) {
  console.log('Fetching Warframes from WFCD...');
  const items = await fetchJson(`${WFCD_BASE}/Warframes.json`);

  const existing = new Set(gear.warframes.map(w => w.name));
  const added = [];

  for (const item of items) {
    if (!item.name || existing.has(item.name)) continue;
    if (item.type !== 'Warframe') continue;
    if (WARFRAME_EXCLUSIONS.has(item.name)) continue;
    // Necramechs have productCategory "Mechs" in WFCD
    if (item.productCategory && /mech/i.test(item.productCategory)) continue;

    added.push(item.name);
    if (!DRY_RUN) {
      gear.warframes.push({ name: item.name, isFounderOnly: false });
      existing.add(item.name);
    }
  }

  if (added.length > 0) {
    if (!DRY_RUN) gear.warframes.sort((a, b) => a.name.localeCompare(b.name));
    console.log(`  ${DRY_RUN ? '[DRY RUN] Would add' : 'Added'} ${added.length} new Warframe(s): ${added.join(', ')}`);
  } else {
    console.log('  No new Warframes found.');
  }
}

async function syncWeapons(gear, category, jsonFile, trackerKey, componentFilter) {
  console.log(`Fetching ${category} weapons from WFCD...`);
  const items = await fetchJson(`${WFCD_BASE}/${jsonFile}`);

  const getItemName = w => (typeof w === 'string' ? w : w.name);
  const existing = new Set(gear[trackerKey].map(getItemName));
  const added = [];

  for (const item of items) {
    if (!item.name || existing.has(item.name)) continue;
    if (componentFilter && componentFilter(item.name)) continue;
    if (INTERNAL_WEAPON_PATTERNS.some(re => re.test(item.name))) continue;
    // Skip Conclave-only or Test/unreleased items (no masteryReq usually means it's a component)
    if (item.masteryReq === undefined && item.tradable === false) continue;

    added.push(item.name);
    if (!DRY_RUN) {
      const isString = typeof gear[trackerKey][0] === 'string';
      gear[trackerKey].push(isString ? item.name : { name: item.name });
      existing.add(item.name);
    }
  }

  if (added.length > 0) {
    if (!DRY_RUN) {
      gear[trackerKey].sort((a, b) => getItemName(a).localeCompare(getItemName(b)));
    }
    console.log(`  ${DRY_RUN ? '[DRY RUN] Would add' : 'Added'} ${added.length} new ${category}(s): ${added.join(', ')}`);
  } else {
    console.log(`  No new ${category} weapons found.`);
  }
}

async function main() {
  if (DRY_RUN) console.log('--- DRY RUN MODE: no changes will be written ---\n');

  console.log('Loading data/gear.json...');
  const gear = JSON.parse(fs.readFileSync(GEAR_FILE, 'utf-8'));

  try {
    await syncWarframes(gear);
    await syncWeapons(gear, 'Primary', 'Primary.json', 'primaries', null);
    await syncWeapons(gear, 'Secondary', 'Secondary.json', 'secondaries', isKitgunComponent);
    await syncWeapons(gear, 'Melee', 'Melee.json', 'melees', isZawComponent);
  } catch (err) {
    console.error('\nError fetching from WFCD:', err.message);
    process.exit(1);
  }

  if (!DRY_RUN) {
    fs.writeFileSync(GEAR_FILE, JSON.stringify(gear, null, 2) + '\n', 'utf-8');
    fs.writeFileSync(OUT_FILE, buildMerged(), 'utf-8');
    console.log('\nDone. Updated data/gear.json and regenerated tracker-data.json.');
    console.log('Review the diff before committing.');
  } else {
    console.log('\nDry run complete. Run without --dry-run to apply.');
  }
}

main();
