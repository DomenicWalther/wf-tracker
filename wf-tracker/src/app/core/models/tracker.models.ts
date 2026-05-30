export interface TrackerState {
  checkboxes: Record<string, boolean>;
  numberValues: Record<string, number>;
  textValues: Record<string, string>;
  settings: TrackerSettings;
  sectionToggles: SectionToggles;
  personalGoals: PersonalGoal[];
  todoItems: TodoItem[];
  bigGoals: string[];
}

export interface TrackerSettings {
  isFounder: boolean;
  includeConclave: boolean;
  gear: GearSettings;
  incarnon: { completionist: boolean };
  arcane: { psycho: boolean };
  mod: { hoarder: boolean };
  railjack: { partHoarder: boolean };
  relic: { hoarder: boolean };
  blueprint: { hoarder: boolean };
  cosmetics: CosmeticsSettings;
  collectable: CollectableSettings;
  decorations: DecorationsSettings;
  codex: { old: boolean };
  market: { extra: boolean };
  extra: { prime: boolean; plat: boolean; founder: boolean };
}

export interface GearSettings {
  reactor: boolean;
  exilus: boolean;
  shards: boolean;
  tauForged: boolean;
  arcaneAdapter: boolean;
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
  subsume: boolean;
  railjack: boolean;
  relics: boolean;
  blueprints: boolean;
  items: boolean;
  cosmetics: boolean;
  collectable: boolean;
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
    reactor: false, exilus: false, shards: false, tauForged: false,
    arcaneAdapter: false, maxBuild: false, auraForma: false,
    stanceForma: false, ampArcaneAdapter: false, lens: false
  },
  incarnon: { completionist: false },
  arcane: { psycho: false },
  mod: { hoarder: false },
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
  extra: { prime: false, plat: false, founder: false }
};

export const DEFAULT_SECTION_TOGGLES: SectionToggles = {
  quests: true, gear: true, lichGear: true, incarnon: true, arcanes: true,
  mods: true, subsume: false, railjack: false, relics: false, blueprints: false,
  items: false, cosmetics: false, collectable: false, decorations: false,
  codex: false, market: false, extra: false, modularGear: false
};
