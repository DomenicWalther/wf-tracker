import { describe, it, expect } from 'vitest';
import { sectionKeys, sectionProgress, arcaneKey, IsChecked } from './section-progress';
import { TrackerData, TrackerSettings, DEFAULT_SETTINGS } from '../models/tracker.models';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns a TrackerSettings that overrides only the specified fields. */
function makeSettings(overrides: Partial<TrackerSettings> = {}): TrackerSettings {
  return {
    ...DEFAULT_SETTINGS,
    gear: { ...DEFAULT_SETTINGS.gear, ...(overrides.gear ?? {}) },
    incarnon: { ...DEFAULT_SETTINGS.incarnon, ...(overrides.incarnon ?? {}) },
    arcane: { ...DEFAULT_SETTINGS.arcane, ...(overrides.arcane ?? {}) },
    mod: { ...DEFAULT_SETTINGS.mod, ...(overrides.mod ?? {}) },
    atragraph: { ...DEFAULT_SETTINGS.atragraph, ...(overrides.atragraph ?? {}) },
    railjack: { ...DEFAULT_SETTINGS.railjack, ...(overrides.railjack ?? {}) },
    relic: { ...DEFAULT_SETTINGS.relic, ...(overrides.relic ?? {}) },
    blueprint: { ...DEFAULT_SETTINGS.blueprint, ...(overrides.blueprint ?? {}) },
    cosmetics: { ...DEFAULT_SETTINGS.cosmetics, ...(overrides.cosmetics ?? {}) },
    collectable: { ...DEFAULT_SETTINGS.collectable, ...(overrides.collectable ?? {}) },
    decorations: { ...DEFAULT_SETTINGS.decorations, ...(overrides.decorations ?? {}) },
    ...overrides,
  };
}

/** Minimal TrackerData – only the fields each test needs are populated. */
function emptyData(): TrackerData {
  return {
    quests: [],
    gear: {},
    lichGear: {},
    incarnon: [],
    arcanes: {},
    mods: [],
    atragraph: [],
    subsume: [],
    railjack: { intrinsics: [], components: [] },
    relics: {},
    blueprints: {},
    items: {},
    cosmetics: {},
    collectable: {},
    accolade: {},
    decorations: {},
    codex: {},
    market: {},
    extra: {},
    bigGoals: [],
    versionLog: [],
    modularGear: {},
    settingsDefinitions: {},
  };
}

/** isChecked that always returns false (nothing collected). */
const noneChecked: IsChecked = () => false;

/** isChecked that always returns true (everything collected). */
const allChecked: IsChecked = () => true;

/** Build an isChecked from a set of known keys. */
function checkedSet(keys: string[]): IsChecked {
  const s = new Set(keys);
  return (k: string) => s.has(k);
}

// ─── arcaneKey ────────────────────────────────────────────────────────────────

describe('arcaneKey', () => {
  it('returns the owned key without suffix', () => {
    expect(arcaneKey('warframe', 'Energize', 'owned')).toBe('arcane:warframe:Energize');
  });

  it('returns the maxed key with :maxed suffix', () => {
    expect(arcaneKey('warframe', 'Energize', 'maxed')).toBe('arcane:warframe:Energize:maxed');
  });

  it('returns intermediate rank keys with rank suffix', () => {
    expect(arcaneKey('warframe', 'Energize', 'r3')).toBe('arcane:warframe:Energize:r3');
  });
});

// ─── arcanes ──────────────────────────────────────────────────────────────────

describe('sectionKeys – arcanes', () => {
  it('returns empty array when arcanes data is absent', () => {
    const d = { ...emptyData(), arcanes: {} };
    expect(sectionKeys('arcanes', d, makeSettings())).toEqual([]);
  });

  it('without psycho mode emits only owned + maxed per arcane', () => {
    const d = { ...emptyData(), arcanes: { warframe: ['Energize', 'Avenger'] } };
    const keys = sectionKeys('arcanes', d, makeSettings({ arcane: { psycho: false } }));
    // 2 arcanes × 2 cols = 4
    expect(keys).toHaveLength(4);
    expect(keys).toContain('arcane:warframe:Energize');
    expect(keys).toContain('arcane:warframe:Energize:maxed');
    expect(keys).toContain('arcane:warframe:Avenger');
    expect(keys).toContain('arcane:warframe:Avenger:maxed');
  });

  it('with psycho mode emits 6 cols for unlimited groups', () => {
    const d = { ...emptyData(), arcanes: { warframe: ['Energize'] } };
    const keys = sectionKeys('arcanes', d, makeSettings({ arcane: { psycho: true } }));
    // owned, r1, r2, r3, r4, maxed = 6
    expect(keys).toHaveLength(6);
    expect(keys).toContain('arcane:warframe:Energize:r3');
    expect(keys).toContain('arcane:warframe:Energize:r4');
  });

  it('with psycho mode emits only 4 cols for limited groups (operator/amp/kitgun/zaw)', () => {
    const d = { ...emptyData(), arcanes: { operator: ['Magus Vigor'] } };
    const keys = sectionKeys('arcanes', d, makeSettings({ arcane: { psycho: true } }));
    // owned, r1, r2, maxed = 4
    expect(keys).toHaveLength(4);
    expect(keys).not.toContain('arcane:operator:Magus Vigor:r3');
    expect(keys).not.toContain('arcane:operator:Magus Vigor:r4');
  });
});

// ─── mods ─────────────────────────────────────────────────────────────────────

describe('sectionKeys – mods', () => {
  it('without hoarder emits owned + maxed per mod', () => {
    const d = {
      ...emptyData(),
      mods: [{ name: 'Serration', maxRank: 10, category: 'Rifle' }],
    };
    const keys = sectionKeys('mods', d, makeSettings({ mod: { hoarder: false } }));
    expect(keys).toEqual(['mod:Serration:owned', 'mod:Serration:maxed']);
  });

  it('with hoarder emits one key per rank level (0 to maxRank)', () => {
    const d = {
      ...emptyData(),
      mods: [{ name: 'Serration', maxRank: 10, category: 'Rifle' }],
    };
    const keys = sectionKeys('mods', d, makeSettings({ mod: { hoarder: true } }));
    // r0 … r10 = 11 keys
    expect(keys).toHaveLength(11);
    expect(keys).toContain('mod:Serration:r0');
    expect(keys).toContain('mod:Serration:r10');
  });

  it('excludes Conclave mods when includeConclave is false', () => {
    const d = {
      ...emptyData(),
      mods: [
        { name: 'Pointed Wind', maxRank: 5, category: 'Conclave' },
        { name: 'Serration', maxRank: 10, category: 'Rifle' },
      ],
    };
    const keys = sectionKeys('mods', d, makeSettings({ includeConclave: false }));
    expect(keys.some(k => k.includes('Pointed Wind'))).toBe(false);
    expect(keys.some(k => k.includes('Serration'))).toBe(true);
  });

  it('includes Conclave mods when includeConclave is true', () => {
    const d = {
      ...emptyData(),
      mods: [{ name: 'Pointed Wind', maxRank: 5, category: 'Conclave' }],
    };
    const keys = sectionKeys('mods', d, makeSettings({ includeConclave: true }));
    expect(keys.some(k => k.includes('Pointed Wind'))).toBe(true);
  });

  it('excludes Conclave Augment mods when includeConclave is false', () => {
    const d = {
      ...emptyData(),
      mods: [{ name: 'Sling Stone', maxRank: 3, category: 'Conclave Augment' }],
    };
    const keys = sectionKeys('mods', d, makeSettings({ includeConclave: false }));
    expect(keys).toHaveLength(0);
  });
});

// ─── atragraph ────────────────────────────────────────────────────────────────

describe('sectionKeys – atragraph', () => {
  const atragraphData: TrackerData = {
    ...emptyData(),
    atragraph: [{ name: 'Serration', variants: ['Rifle', 'Shotgun', 'Pistol'] }],
  };

  it('without collectAll emits one key per foil', () => {
    const keys = sectionKeys('atragraph', atragraphData, makeSettings({ atragraph: { collectAll: false } }));
    expect(keys).toEqual(['atragraph:Atragraph Serration']);
  });

  it('with collectAll emits one key per variant', () => {
    const keys = sectionKeys('atragraph', atragraphData, makeSettings({ atragraph: { collectAll: true } }));
    expect(keys).toHaveLength(3);
    expect(keys).toContain('atragraph:Atragraph Serration:Rifle');
    expect(keys).toContain('atragraph:Atragraph Serration:Shotgun');
  });
});

// ─── relics ───────────────────────────────────────────────────────────────────

describe('sectionKeys – relics', () => {
  const relicData: TrackerData = {
    ...emptyData(),
    relics: { Axi: ['A1', 'A2'] },
  };

  it('without hoarder emits owned + radiant per relic', () => {
    const keys = sectionKeys('relics', relicData, makeSettings({ relic: { hoarder: false } }));
    expect(keys).toHaveLength(4);
    expect(keys).toContain('relic:A1');
    expect(keys).toContain('relic:A1:radiant');
    expect(keys).not.toContain('relic:A1:exceptional');
  });

  it('with hoarder emits 4 refinement cols per relic', () => {
    const keys = sectionKeys('relics', relicData, makeSettings({ relic: { hoarder: true } }));
    // 2 relics × 4 cols = 8
    expect(keys).toHaveLength(8);
    expect(keys).toContain('relic:A1:exceptional');
    expect(keys).toContain('relic:A1:flawless');
  });
});

// ─── railjack ─────────────────────────────────────────────────────────────────

describe('sectionKeys – railjack', () => {
  it('without partHoarder deduplicates components by house+component', () => {
    const d: TrackerData = {
      ...emptyData(),
      railjack: {
        intrinsics: ['Tactical'],
        components: [
          { house: 'Lavan', component: 'Engine', bonus: 'Shield' },
          { house: 'Lavan', component: 'Engine', bonus: 'Speed' },
        ],
      },
    };
    const keys = sectionKeys('railjack', d, makeSettings({ railjack: { partHoarder: false } }));
    expect(keys).toContain('rj:intr:Tactical');
    expect(keys.filter(k => k.startsWith('rj:comp:'))).toHaveLength(1);
  });

  it('with partHoarder keeps each bonus variant as a separate key', () => {
    const d: TrackerData = {
      ...emptyData(),
      railjack: {
        intrinsics: [],
        components: [
          { house: 'Lavan', component: 'Engine', bonus: 'Shield' },
          { house: 'Lavan', component: 'Engine', bonus: 'Speed' },
        ],
      },
    };
    const keys = sectionKeys('railjack', d, makeSettings({ railjack: { partHoarder: true } }));
    expect(keys).toHaveLength(2);
    expect(keys).toContain('rj:comp:Lavan:Engine:Shield');
    expect(keys).toContain('rj:comp:Lavan:Engine:Speed');
  });
});

// ─── blueprints ───────────────────────────────────────────────────────────────

describe('sectionKeys – blueprints', () => {
  it('without hoarder excludes old blueprints', () => {
    const d: TrackerData = {
      ...emptyData(),
      blueprints: {
        Warframe: {
          Core: [
            { name: 'Excalibur Blueprint', isOld: false },
            { name: 'Excalibur Chassis', isOld: true },
          ],
        },
      },
    };
    const keys = sectionKeys('blueprints', d, makeSettings({ blueprint: { hoarder: false } }));
    expect(keys).toContain('bp:Excalibur Blueprint');
    expect(keys).not.toContain('bp:Excalibur Chassis');
  });

  it('with hoarder includes old blueprints', () => {
    const d: TrackerData = {
      ...emptyData(),
      blueprints: {
        Warframe: {
          Core: [{ name: 'Excalibur Chassis', isOld: true }],
        },
      },
    };
    const keys = sectionKeys('blueprints', d, makeSettings({ blueprint: { hoarder: true } }));
    expect(keys).toContain('bp:Excalibur Chassis');
  });
});

// ─── incarnon ─────────────────────────────────────────────────────────────────

describe('sectionKeys – incarnon', () => {
  const incarnonData: TrackerData = {
    ...emptyData(),
    incarnon: [
      { name: '1 FAMILY', weapons: ['Braton', 'Lato', 'Skana'] },
      { name: '2 FAMILY', weapons: ['Lex', 'Boltor'] },
    ],
  };

  it('without completionist only tracks the family name for non-first families', () => {
    const keys = sectionKeys('incarnon', incarnonData, makeSettings({ incarnon: { completionist: false } }));
    // family 1 always expands; family 2 does NOT expand without completionist
    expect(keys.some(k => k.includes('Braton'))).toBe(true);
    expect(keys.some(k => k.includes('Lex'))).toBe(false);
    expect(keys.some(k => k.includes('2 FAMILY'))).toBe(true);
  });

  it('with completionist expands all families to individual weapons', () => {
    const keys = sectionKeys('incarnon', incarnonData, makeSettings({ incarnon: { completionist: true } }));
    expect(keys.some(k => k.includes('Lex'))).toBe(true);
    expect(keys.some(k => k.includes('Boltor'))).toBe(true);
    expect(keys.some(k => k.includes('2 FAMILY'))).toBe(false);
  });

  it('emits earned, installed, maxed per weapon row', () => {
    const d: TrackerData = {
      ...emptyData(),
      incarnon: [{ name: '1 FAMILY', weapons: ['Braton'] }],
    };
    const keys = sectionKeys('incarnon', d, makeSettings());
    expect(keys).toContain('incarnon:family:Braton:earned');
    expect(keys).toContain('incarnon:family:Braton:installed');
    expect(keys).toContain('incarnon:family:Braton:maxed');
  });
});

// ─── cosmetics ────────────────────────────────────────────────────────────────

describe('sectionKeys – cosmetics', () => {
  const cosmeticsData: TrackerData = {
    ...emptyData(),
    cosmetics: {
      TENNOGEN: {
        PC: ['Ivara Kuvael'],
        CONSOLE: ['Ivara Console Skin'],
      },
      'REMAINING COSMETICS': {
        Extra: ['Rare Extra Item'],
        Standard: ['Common Skin'],
      },
    },
  };

  it('excludes TENNOGEN entirely when tennogen setting is off', () => {
    const keys = sectionKeys('cosmetics', cosmeticsData, makeSettings({
      cosmetics: { ...DEFAULT_SETTINGS.cosmetics, tennogen: false },
    }));
    expect(keys.some(k => k.includes('Ivara'))).toBe(false);
  });

  it('includes TENNOGEN PC items when tennogen is on', () => {
    const keys = sectionKeys('cosmetics', cosmeticsData, makeSettings({
      cosmetics: { ...DEFAULT_SETTINGS.cosmetics, tennogen: true },
    }));
    expect(keys).toContain('cos:Ivara Kuvael');
  });

  it('excludes TENNOGEN CONSOLE when consoleExclusive is off even if tennogen is on', () => {
    const keys = sectionKeys('cosmetics', cosmeticsData, makeSettings({
      cosmetics: { ...DEFAULT_SETTINGS.cosmetics, tennogen: true, consoleExclusive: false },
    }));
    expect(keys).not.toContain('cos:Ivara Console Skin');
  });

  it('includes TENNOGEN CONSOLE when both tennogen and consoleExclusive are on', () => {
    const keys = sectionKeys('cosmetics', cosmeticsData, makeSettings({
      cosmetics: { ...DEFAULT_SETTINGS.cosmetics, tennogen: true, consoleExclusive: true },
    }));
    expect(keys).toContain('cos:Ivara Console Skin');
  });

  it('excludes Extra cosmetics sub-category when extra setting is off', () => {
    const keys = sectionKeys('cosmetics', cosmeticsData, makeSettings({
      cosmetics: { ...DEFAULT_SETTINGS.cosmetics, extra: false },
    }));
    expect(keys).not.toContain('cos:Rare Extra Item');
    expect(keys).toContain('cos:Common Skin');
  });
});

// ─── collectable ──────────────────────────────────────────────────────────────

describe('sectionKeys – collectable', () => {
  const collectableData: TrackerData = {
    ...emptyData(),
    collectable: {
      'OLD IMPOSSIBLE GLYPHS': ['Old Glyph A'],
      'REGULAR GLYPHS': ['Regular Glyph B'],
    },
  };

  it('excludes OLD IMPOSSIBLE GLYPHS when old setting is false', () => {
    const keys = sectionKeys('collectable', collectableData, makeSettings({
      collectable: { ...DEFAULT_SETTINGS.collectable, old: false },
    }));
    expect(keys).not.toContain('col:Old Glyph A');
    expect(keys).toContain('col:Regular Glyph B');
  });

  it('includes OLD IMPOSSIBLE GLYPHS when old setting is true', () => {
    const keys = sectionKeys('collectable', collectableData, makeSettings({
      collectable: { ...DEFAULT_SETTINGS.collectable, old: true },
    }));
    expect(keys).toContain('col:Old Glyph A');
  });
});

// ─── lichGear ─────────────────────────────────────────────────────────────────

describe('sectionKeys – lichGear', () => {
  it('emits lich, :60, :vf keys for non-ephemera groups', () => {
    const d: TrackerData = {
      ...emptyData(),
      lichGear: { Weapons: ['Kuva Bramma'] },
    };
    const keys = sectionKeys('lichGear', d, makeSettings());
    expect(keys).toContain('lich:Kuva Bramma');
    expect(keys).toContain('lich:Kuva Bramma:60');
    expect(keys).toContain('lich:Kuva Bramma:vf');
  });

  it('emits col: keys for ephemera groups (synced with collectables)', () => {
    const d: TrackerData = {
      ...emptyData(),
      lichGear: { 'lich ephemera': ['Vengeful Flame'] },
    };
    const keys = sectionKeys('lichGear', d, makeSettings());
    expect(keys).toContain('col:Vengeful Flame');
    expect(keys).not.toContain('lich:Vengeful Flame');
  });
});

// ─── simple sections ──────────────────────────────────────────────────────────

describe('sectionKeys – simple sections', () => {
  it('quests emits quest:<name> keys', () => {
    const d: TrackerData = { ...emptyData(), quests: ['The War Within', 'Natah'] };
    const keys = sectionKeys('quests', d, makeSettings());
    expect(keys).toEqual(['quest:The War Within', 'quest:Natah']);
  });

  it('subsume emits subsume:<warframe> keys', () => {
    const d: TrackerData = {
      ...emptyData(),
      subsume: [
        { warframe: 'Excalibur', ability: 'Radial Blind' },
        { warframe: 'Volt', ability: 'Speed' },
      ],
    };
    const keys = sectionKeys('subsume', d, makeSettings());
    expect(keys).toEqual(['subsume:Excalibur', 'subsume:Volt']);
  });

  it('modularGear emits mod_gear:<name> keys', () => {
    const d: TrackerData = {
      ...emptyData(),
      modularGear: { Kitguns: ['Catchmoon', 'Rattleguts'] },
    };
    const keys = sectionKeys('modularGear', d, makeSettings());
    expect(keys).toContain('mod_gear:Catchmoon');
    expect(keys).toContain('mod_gear:Rattleguts');
  });
});

// ─── sectionProgress ──────────────────────────────────────────────────────────

describe('sectionProgress', () => {
  it('returns 0/0 for honoria regardless of data', () => {
    const result = sectionProgress('honoria', emptyData(), makeSettings(), allChecked);
    expect(result).toEqual({ completed: 0, total: 0 });
  });

  it('returns 0/0 when data section is empty', () => {
    const result = sectionProgress('quests', emptyData(), makeSettings(), allChecked);
    expect(result).toEqual({ completed: 0, total: 0 });
  });

  it('total matches key list length and completed counts checked keys', () => {
    const d: TrackerData = { ...emptyData(), quests: ['Q1', 'Q2', 'Q3'] };
    const checked = checkedSet(['quest:Q1', 'quest:Q3']);
    const result = sectionProgress('quests', d, makeSettings(), checked);
    expect(result.total).toBe(3);
    expect(result.completed).toBe(2);
  });

  it('completed is 0 when nothing is checked', () => {
    const d: TrackerData = { ...emptyData(), quests: ['Q1', 'Q2'] };
    const result = sectionProgress('quests', d, makeSettings(), noneChecked);
    expect(result).toEqual({ completed: 0, total: 2 });
  });

  it('completed equals total when everything is checked', () => {
    const d: TrackerData = { ...emptyData(), quests: ['Q1', 'Q2'] };
    const result = sectionProgress('quests', d, makeSettings(), allChecked);
    expect(result).toEqual({ completed: 2, total: 2 });
  });

  it('mod hoarder mode changes total relative to non-hoarder', () => {
    const d: TrackerData = {
      ...emptyData(),
      mods: [{ name: 'Serration', maxRank: 10, category: 'Rifle' }],
    };
    const noHoarder = sectionProgress('mods', d, makeSettings({ mod: { hoarder: false } }), noneChecked);
    const hoarder   = sectionProgress('mods', d, makeSettings({ mod: { hoarder: true } }), noneChecked);
    // non-hoarder: owned + maxed = 2; hoarder: r0–r10 = 11
    expect(noHoarder.total).toBe(2);
    expect(hoarder.total).toBe(11);
  });

  it('stale checked keys outside canonical set do not inflate completed count', () => {
    const d: TrackerData = { ...emptyData(), quests: ['Q1'] };
    // Simulate a stale key that is not in the canonical set
    const checked = checkedSet(['quest:Q1', 'quest:STALE_KEY_NOT_IN_DATA']);
    const result = sectionProgress('quests', d, makeSettings(), checked);
    expect(result.total).toBe(1);
    expect(result.completed).toBe(1);
  });
});

// ─── decorations ──────────────────────────────────────────────────────────────

describe('sectionKeys – decorations', () => {
  it('excludes Tennocon Locked decorations when extra setting is false', () => {
    const d: TrackerData = {
      ...emptyData(),
      decorations: {
        'Tennocon Locked': ['TennoconDec'],
        'Standard': ['NormalDec'],
      },
    };
    const keys = sectionKeys('decorations', d, makeSettings({ decorations: { ...DEFAULT_SETTINGS.decorations, extra: false } }));
    expect(keys).not.toContain('dec:TennoconDec');
    expect(keys).toContain('dec:NormalDec');
  });

  it('includes Tennocon Locked decorations when extra setting is true', () => {
    const d: TrackerData = {
      ...emptyData(),
      decorations: { 'Tennocon Locked': ['TennoconDec'] },
    };
    const keys = sectionKeys('decorations', d, makeSettings({ decorations: { ...DEFAULT_SETTINGS.decorations, extra: true } }));
    expect(keys).toContain('dec:TennoconDec');
  });
});
