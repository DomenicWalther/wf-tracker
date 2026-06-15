// ─── Data-file types ──────────────────────────────────────────────────────────

export interface GearItem {
  name: string;
  isFounderOnly?: boolean;
}

export interface IncarnonEntry {
  name: string;
  weapons: string[];
  /** Weekly rotation number (1-based). Absent for Duviri weapons. */
  week?: number;
}

export interface ModEntry {
  name: string;
  maxRank: number;
  category: string;
}

export interface AtragraphEntry {
  /** Base mod name the foil family is named after (display foil = "Atragraph " + name). */
  name: string;
  /** Mod variants the foil art can be applied to. */
  variants: string[];
}

export interface SubsumeEntry {
  warframe: string;
  ability: string;
}

export interface BlueprintEntry {
  name: string;
  isOld?: boolean;
}

export interface VersionLogEntry {
  date: string;
  version: string;
  description: string;
  summary?: string;
  details?: string;
}

export interface RailjackComponent {
  house: string;
  component: string;
  bonus: string;
}

export interface TrackerData {
  quests: string[];
  gear: Record<string, GearItem[]>;
  lichGear: Record<string, string[]>;
  incarnon: IncarnonEntry[];
  arcanes: Record<string, string[]>;
  mods: ModEntry[];
  atragraph: AtragraphEntry[];
  subsume: SubsumeEntry[];
  railjack: { intrinsics: string[]; components: RailjackComponent[] };
  relics: Record<string, string[]>;
  blueprints: Record<string, Record<string, BlueprintEntry[]>>;
  items: Record<string, string[]>;
  cosmetics: Record<string, Record<string, string[]>>;
  collectable: Record<string, string[]>;
  accolade: Record<string, string[]>;
  decorations: Record<string, string[]>;
  codex: Record<string, string[]>;
  market: Record<string, string[]>;
  extra: Record<string, string[]>;
  bigGoals: string[];
  versionLog: VersionLogEntry[];
  modularGear: Record<string, string[]>;
  settingsDefinitions: Record<string, string | Record<string, string>>;
}

// ─── Checklist UI types ───────────────────────────────────────────────────────

export interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
  tag?: string;
}

/** Alias for ChecklistItem (view-model naming). */
export type ChecklistItemView = ChecklistItem;

export interface ChecklistGroup {
  name: string;
  items: ChecklistItem[];
}

/** Alias for ChecklistGroup (view-model naming). */
export type ChecklistGroupView = ChecklistGroup;

// ─── Tracker state types ──────────────────────────────────────────────────────

export interface TrackerState {
  checkboxes: Record<string, boolean>;
  numberValues: Record<string, number>;
  textValues: Record<string, string>;
  settings: TrackerSettings;
  sectionToggles: SectionToggles;
  personalGoals: PersonalGoal[];
  todoItems: TodoItem[];
  bigGoals: string[];
  /** True once Big Goals have been seeded from the data file (or the user has edited them). Prevents re-seeding over an intentionally empty list. */
  bigGoalsSeeded: boolean;
}

export type PinnedWidget = 'world-state' | 'task-checklist';

export interface PinnedBarSettings {
  widgets: PinnedWidget[];
  hiddenCycles: string[];
}

export interface TrackerSettings {
  isFounder: boolean;
  includeConclave: boolean;
  showWikiLinks: boolean;
  gear: GearSettings;
  incarnon: { completionist: boolean };
  arcane: { psycho: boolean };
  mod: { hoarder: boolean };
  atragraph: { collectAll: boolean };
  railjack: { partHoarder: boolean };
  relic: { hoarder: boolean };
  blueprint: { hoarder: boolean };
  cosmetics: CosmeticsSettings;
  collectable: CollectableSettings;
  decorations: DecorationsSettings;
  codex: { old: boolean };
  market: { extra: boolean };
  extra: { prime: boolean; plat: boolean; founder: boolean };
  pinnedBar: PinnedBarSettings;
}

export interface GearSettings {
  primeOnlyGear: boolean;
  reactor: boolean;
  exilus: boolean;
  shards: boolean;
  tauForged: boolean;
  arcaneAdapter: boolean;
  exilusAdapter: boolean;
  maxBuild: boolean;
  auraForma: boolean;
  stanceForma: boolean;
  ampArcaneAdapter: boolean;
  lens: boolean;
}

export interface CosmeticsSettings {
  prime: boolean;
  consoleExclusive: boolean;
  tennogen: boolean;
  steamItems: boolean;
  nightwave: boolean;
  old: boolean;
  extra: boolean;
  founder: boolean;
}

export interface CollectableSettings {
  eventLocked: boolean;
  old: boolean;
  prime: boolean;
  consoleExclusive: boolean;
  extra: boolean;
}

export interface DecorationsSettings {
  primeAccess: boolean;
  events: boolean;
  nightwave: boolean;
  old: boolean;
  extra: boolean;
  founder: boolean;
}

export interface SectionToggles {
  quests: boolean;
  gear: boolean;
  lichGear: boolean;
  incarnon: boolean;
  arcanes: boolean;
  mods: boolean;
  atragraph: boolean;
  subsume: boolean;
  railjack: boolean;
  relics: boolean;
  honoria: boolean;
  blueprints: boolean;
  items: boolean;
  cosmetics: boolean;
  collectable: boolean;
  accolade: boolean;
  decorations: boolean;
  codex: boolean;
  market: boolean;
  extra: boolean;
  modularGear: boolean;
}

export interface PersonalGoal {
  id: string;
  goal: string;
  type: 'number' | 'checkbox';
  current?: number;
  target?: number;
  completed?: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface SectionProgress {
  completed: number;
  total: number;
  percentage: number;
}

export const DEFAULT_SETTINGS: TrackerSettings = {
  isFounder: false,
  includeConclave: false,
  gear: {
    primeOnlyGear: false,
    reactor: false, exilus: false, shards: false, tauForged: false,
    arcaneAdapter: false, exilusAdapter: false, maxBuild: false, auraForma: false,
    stanceForma: false, ampArcaneAdapter: false, lens: false
  },
  incarnon: { completionist: false },
  arcane: { psycho: false },
  mod: { hoarder: false },
  atragraph: { collectAll: false },
  railjack: { partHoarder: false },
  relic: { hoarder: false },
  blueprint: { hoarder: false },
  cosmetics: {
    prime: false, consoleExclusive: false, tennogen: false,
    steamItems: false, nightwave: false, old: false, extra: false, founder: false
  },
  collectable: { eventLocked: false, old: false, prime: false, consoleExclusive: false, extra: false },
  decorations: { primeAccess: false, events: false, nightwave: false, old: false, extra: false, founder: false },
  codex: { old: false },
  market: { extra: false },
  extra: { prime: false, plat: false, founder: false },
  showWikiLinks: false,
  pinnedBar: { widgets: [], hiddenCycles: [] }
};

export const DEFAULT_SECTION_TOGGLES: SectionToggles = {
  quests: true, gear: true, lichGear: true, incarnon: true, arcanes: true,
  mods: true, atragraph: false, subsume: false, railjack: false, relics: false, blueprints: false,
  items: false, cosmetics: false, collectable: false, accolade: true, decorations: false,
  codex: false, market: false, extra: false, modularGear: false, honoria: true
};
