/**
 * SINGLE SOURCE OF TRUTH for per-section progress counting.
 *
 * Every section's progress is defined here as the canonical *set of storage
 * keys* that are in scope for the current data + settings. Both `completed` and
 * `total` are then derived from that one list:
 *
 *   total     = keys.length
 *   completed = keys.filter(isChecked).length
 *
 * Because both numbers come from the same key list, they can never diverge, and
 * stale checkboxes left in storage by a scope-reducing setting (e.g. toggling
 * Arcane Psycho off, or Hoarder off) are simply ignored — a key that is not in
 * the canonical set does not count.
 *
 * Consumers — the sidebar overall %, the dashboard cards, and each feature
 * page — MUST route their counting through `sectionProgress()` (or the exported
 * key builders) so all three always agree. Do not re-derive totals by hand.
 */
import { TrackerData, TrackerSettings, SectionToggles } from '../models/tracker.models';
import { ALL_GEAR_COLUMNS, GEAR_SECTION_COLUMNS } from '../config/gear-columns';
import { countGearSection, countDualFrameItem } from './gear-variants';

export interface SectionProgress {
  completed: number;
  total: number;
}

export type IsChecked = (key: string) => boolean;

/** Arcane groups that cap at rank 3 (4 copies), so they expose fewer rank columns. */
const LIMITED_ARCANE_GROUPS = new Set(['operator', 'amp', 'kitgun', 'zaw']);

/** Sections whose progress is a flat one-key-per-data-name list. */
type SimpleSection =
  | 'quests' | 'subsume' | 'items' | 'codex' | 'market' | 'extra' | 'modularGear';

// ─── Per-section canonical key builders ───────────────────────────────────────

function arcaneKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.arcanes) return [];
  const psycho = settings.arcane.psycho;
  const keys: string[] = [];
  for (const [group, items] of Object.entries(d.arcanes)) {
    const limited = LIMITED_ARCANE_GROUPS.has(group);
    const cols = psycho
      ? (limited ? ['owned', 'r1', 'r2', 'maxed'] : ['owned', 'r1', 'r2', 'r3', 'r4', 'maxed'])
      : ['owned', 'maxed'];
    for (const name of items) {
      for (const col of cols) keys.push(arcaneKey(group, name, col));
    }
  }
  return keys;
}

/** Storage key for one arcane cell. Mirrors features/arcanes/arcanes.component.ts. */
export function arcaneKey(group: string, name: string, col: string): string {
  if (col === 'owned') return `arcane:${group}:${name}`;
  if (col === 'maxed') return `arcane:${group}:${name}:maxed`;
  return `arcane:${group}:${name}:${col}`;
}

function modKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.mods) return [];
  const hoarder = settings.mod.hoarder;
  const includeConclave = settings.includeConclave;
  const keys: string[] = [];
  for (const mod of d.mods) {
    if ((mod.category === 'Conclave' || mod.category === 'Conclave Augment') && !includeConclave) continue;
    if (hoarder) {
      for (let r = 0; r <= mod.maxRank; r++) keys.push(`mod:${mod.name}:r${r}`);
    } else {
      keys.push(`mod:${mod.name}:owned`, `mod:${mod.name}:maxed`);
    }
  }
  return keys;
}

function atragraphKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.atragraph) return [];
  const collectAll = settings.atragraph.collectAll;
  const keys: string[] = [];
  for (const entry of d.atragraph) {
    const foil = `Atragraph ${entry.name}`;
    if (collectAll) {
      for (const variant of entry.variants) keys.push(`atragraph:${foil}:${variant}`);
    } else {
      keys.push(`atragraph:${foil}`);
    }
  }
  return keys;
}

function railjackKeys(d: TrackerData, settings: TrackerSettings): string[] {
  const keys: string[] = [];
  for (const name of d.railjack?.intrinsics ?? []) keys.push(`rj:intr:${name}`);
  const components = d.railjack?.components ?? [];
  if (settings.railjack.partHoarder) {
    for (const c of components) keys.push(`rj:comp:${c.house}:${c.component}:${c.bonus}`);
  } else {
    const unique = new Set(components.map(c => `rj:comp:${c.house}:${c.component}`));
    keys.push(...unique);
  }
  return keys;
}

function relicKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.relics) return [];
  const cols = settings.relic.hoarder
    ? ['owned', 'exceptional', 'flawless', 'radiant']
    : ['owned', 'radiant'];
  const keys: string[] = [];
  for (const items of Object.values(d.relics)) {
    for (const name of items) {
      for (const col of cols) keys.push(col === 'owned' ? `relic:${name}` : `relic:${name}:${col}`);
    }
  }
  return keys;
}

function blueprintKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.blueprints) return [];
  const showOld = settings.blueprint.hoarder;
  const keys: string[] = [];
  for (const cat of Object.values(d.blueprints)) {
    for (const items of Object.values(cat)) {
      for (const item of items) {
        if (!showOld && item.isOld) continue;
        keys.push(`bp:${item.name}`);
      }
    }
  }
  return keys;
}

function lichGearKeys(d: TrackerData): string[] {
  if (!d.lichGear) return [];
  const keys: string[] = [];
  for (const [group, items] of Object.entries(d.lichGear)) {
    const isEphemera = group.includes('ephemera');
    for (const item of items) {
      if (isEphemera) {
        keys.push(`col:${item}`); // ephemera sync 1:1 with Collectables
      } else {
        keys.push(`lich:${item}`, `lich:${item}:60`, `lich:${item}:vf`);
      }
    }
  }
  return keys;
}

function incarnonKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.incarnon) return [];
  const completionist = settings.incarnon.completionist;
  const keys: string[] = [];
  for (const entry of d.incarnon) {
    const rows = completionist || entry.name === '1 FAMILY' ? entry.weapons : [entry.name];
    for (const row of rows) {
      keys.push(`incarnon:family:${row}:earned`, `incarnon:family:${row}:installed`, `incarnon:family:${row}:maxed`);
    }
  }
  return keys;
}

function cosmeticsKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.cosmetics) return [];
  const s = settings.cosmetics;
  const keys: string[] = [];
  for (const [cat, subs] of Object.entries(d.cosmetics)) {
    if (cat === 'TENNOGEN' && !s.tennogen) continue;
    for (const [sub, items] of Object.entries(subs)) {
      if (cat === 'TENNOGEN' && sub === 'CONSOLE' && !s.consoleExclusive) continue;
      if (cat === 'REMAINING COSMETICS' && sub === 'Extra' && !s.extra) continue;
      for (const name of items) keys.push(`cos:${name}`);
    }
  }
  return keys;
}

function collectableKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.collectable) return [];
  const keys: string[] = [];
  for (const [group, items] of Object.entries(d.collectable)) {
    if (group === 'OLD IMPOSSIBLE GLYPHS' && !settings.collectable.old) continue;
    for (const name of items) keys.push(`col:${name}`);
  }
  return keys;
}

function decorationKeys(d: TrackerData, settings: TrackerSettings): string[] {
  if (!d.decorations) return [];
  const keys: string[] = [];
  for (const [group, items] of Object.entries(d.decorations)) {
    if (group === 'Tennocon Locked' && !settings.decorations.extra) continue;
    for (const name of items) keys.push(`dec:${name}`);
  }
  return keys;
}

/** Flat `<prefix>:<name>` builders for the simple sections. */
const SIMPLE_SECTIONS: Record<SimpleSection, { prefix: string; field: keyof TrackerData }> = {
  quests:      { prefix: 'quest',    field: 'quests' },
  subsume:     { prefix: 'subsume',  field: 'subsume' },
  items:       { prefix: 'item',     field: 'items' },
  codex:       { prefix: 'codex',    field: 'codex' },
  market:      { prefix: 'market',   field: 'market' },
  extra:       { prefix: 'extra',    field: 'extra' },
  modularGear: { prefix: 'mod_gear', field: 'modularGear' },
};

function simpleKeys(d: TrackerData, section: SimpleSection): string[] {
  const { prefix, field } = SIMPLE_SECTIONS[section];
  const raw = d[field];
  if (!raw) return [];
  if (section === 'quests') return (raw as string[]).map(n => `${prefix}:${n}`);
  if (section === 'subsume') {
    return (d.subsume ?? []).map(s => `subsume:${s.warframe}`);
  }
  // Record<string, string[]>
  const keys: string[] = [];
  for (const items of Object.values(raw as Record<string, string[]>)) {
    for (const name of items) keys.push(`${prefix}:${name}`);
  }
  return keys;
}

// ─── Public API ───────────────────────────────────────────────────────────────

function progressFromKeys(keys: string[], isChecked: IsChecked): SectionProgress {
  let completed = 0;
  for (const k of keys) if (isChecked(k)) completed++;
  return { completed, total: keys.length };
}

/** Gear is counted via the variant-family helper rather than a flat key list. */
function gearProgress(d: TrackerData, settings: TrackerSettings, isChecked: IsChecked): SectionProgress {
  if (!d.gear) return { completed: 0, total: 0 };
  const gearSettings = settings.gear;
  const isFounder = settings.isFounder;
  const primeOnly = gearSettings.primeOnlyGear;
  const activeCols = ALL_GEAR_COLUMNS.filter(
    c => !c.settingKey || (gearSettings as unknown as Record<string, unknown>)[c.settingKey]
  );
  const checked = (name: string, col: string) => isChecked(`gear:${name}:${col}`);

  let completed = 0, total = 0;
  for (const [sectionKey, items] of Object.entries(d.gear)) {
    const allowed = GEAR_SECTION_COLUMNS[sectionKey] ?? ['mastery'];
    const sectionCols = activeCols.filter(c => allowed.includes(c.key));
    const filtered = isFounder ? items : items.filter(i => !i.isFounderOnly);

    const sectionColKeys = sectionCols.map(c => c.key);
    const dualItems = filtered.filter(i => i.dualNames);
    const regularItems = filtered.filter(i => !i.dualNames);

    if (!primeOnly) {
      for (const item of regularItems) {
        for (const col of sectionCols) {
          total++;
          if (checked(item.name, col.key)) completed++;
        }
      }
      for (const item of dualItems) {
        const r = countDualFrameItem(item.name, item.dualNames!, item.sharedColumns ?? [], sectionColKeys, checked);
        total += r.total; completed += r.completed;
      }
      continue;
    }
    const upgradeCols = sectionCols.filter(c => c.key !== 'mastery').map(c => c.key);
    const r = countGearSection(regularItems.map(i => i.name), upgradeCols, checked);
    total += r.total;
    completed += r.completed;
    for (const item of dualItems) {
      const dr = countDualFrameItem(item.name, item.dualNames!, item.sharedColumns ?? [], sectionColKeys, checked);
      total += dr.total; completed += dr.completed;
    }
  }
  return { completed, total };
}

/**
 * Returns the canonical key list for a section, honouring current settings.
 * `gear` has no flat key list (use `sectionProgress`); it returns [] here.
 */
export function sectionKeys(
  section: keyof SectionToggles,
  d: TrackerData,
  settings: TrackerSettings,
): string[] {
  switch (section) {
    case 'arcanes':     return arcaneKeys(d, settings);
    case 'mods':        return modKeys(d, settings);
    case 'atragraph':   return atragraphKeys(d, settings);
    case 'railjack':    return railjackKeys(d, settings);
    case 'relics':      return relicKeys(d, settings);
    case 'blueprints':  return blueprintKeys(d, settings);
    case 'lichGear':    return lichGearKeys(d);
    case 'incarnon':    return incarnonKeys(d, settings);
    case 'cosmetics':   return cosmeticsKeys(d, settings);
    case 'collectable': return collectableKeys(d, settings);
    case 'decorations': return decorationKeys(d, settings);
    case 'quests':
    case 'subsume':
    case 'items':
    case 'codex':
    case 'market':
    case 'extra':
    case 'modularGear': return simpleKeys(d, section);
    case 'gear':
    case 'honoria':     return [];
    default:            return [];
  }
}

/**
 * Canonical `{completed, total}` for a section. `honoria` is tracked by its own
 * service and is not handled here — callers supply it directly.
 */
export function sectionProgress(
  section: keyof SectionToggles,
  d: TrackerData,
  settings: TrackerSettings,
  isChecked: IsChecked,
): SectionProgress {
  if (section === 'gear') return gearProgress(d, settings, isChecked);
  if (section === 'honoria') return { completed: 0, total: 0 };
  return progressFromKeys(sectionKeys(section, d, settings), isChecked);
}
