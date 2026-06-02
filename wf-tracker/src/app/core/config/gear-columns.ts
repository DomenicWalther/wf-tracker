/**
 * Single source of truth for gear column definitions and per-section column maps.
 * Used by both gear.component.ts and dashboard.component.ts to keep totals identical.
 */

export interface GearColumnDef {
  key: string;
  label: string;
  /** The key inside TrackerSettings.gear that enables this column. null = always visible. */
  settingKey: string | null;
}

/** All possible gear columns, in display order. */
export const ALL_GEAR_COLUMNS: GearColumnDef[] = [
  { key: 'mastery',       label: 'Mastery',         settingKey: null },
  { key: 'reactor',       label: 'Reactor',          settingKey: 'reactor' },
  { key: 'exilus',        label: 'Exilus',           settingKey: 'exilus' },
  { key: 'shards',        label: '5 Shards',         settingKey: 'shards' },
  { key: 'tau',           label: 'Tau',              settingKey: 'tauForged' },
  { key: 'maxBuild',      label: 'Max Build',        settingKey: 'maxBuild' },
  { key: 'auraForma',     label: 'Aura Forma',       settingKey: 'auraForma' },
  { key: 'stanceForma',   label: 'Stance Forma',     settingKey: 'stanceForma' },
  { key: 'lens',          label: 'Lens',             settingKey: 'lens' },
  { key: 'arcaneAdapter', label: 'Arcane Adapter',   settingKey: 'arcaneAdapter' },
  { key: 'exilusAdapter', label: 'Exilus Adapter',   settingKey: 'exilusAdapter' },
];

/**
 * Per-section allowed column keys.
 * Canonical — the Gear page is the source of truth; dashboard must match this exactly.
 */
export const GEAR_SECTION_COLUMNS: Record<string, string[]> = {
  warframes:  ['mastery', 'reactor', 'exilus', 'shards', 'tau', 'maxBuild', 'auraForma', 'lens'],
  primaries:  ['mastery', 'reactor', 'arcaneAdapter', 'exilusAdapter', 'maxBuild'],
  secondaries:['mastery', 'reactor', 'arcaneAdapter', 'exilusAdapter', 'maxBuild'],
  melees:     ['mastery', 'reactor', 'arcaneAdapter', 'exilusAdapter', 'maxBuild', 'stanceForma'],
  companions: ['mastery', 'maxBuild'],
  archwings:  ['mastery', 'maxBuild'],
  archGuns:   ['mastery', 'maxBuild'],
  archMelee:  ['mastery', 'maxBuild', 'stanceForma'],
  amps:       ['mastery', 'maxBuild'],
  extras:     ['mastery', 'maxBuild'],
};
