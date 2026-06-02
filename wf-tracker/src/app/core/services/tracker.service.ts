import { Injectable, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  TrackerState, TrackerSettings, SectionToggles, PersonalGoal, TodoItem,
  DEFAULT_SETTINGS, DEFAULT_SECTION_TOGGLES, PinnedBarSettings, TrackerData, IncarnonEntry,
} from '../models/tracker.models';
import { DataService } from './data.service';
import { ALL_GEAR_COLUMNS, GEAR_SECTION_COLUMNS } from '../config/gear-columns';
import { countGearSection } from '../utils/gear-variants';

const STORAGE_KEY = 'wf-tracker-state';

@Injectable({ providedIn: 'root' })
export class TrackerService {
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());
  private readonly state = signal<TrackerState>(this.loadState());

  readonly checkboxes = computed(() => this.state().checkboxes);
  readonly numberValues = computed(() => this.state().numberValues);
  readonly textValues = computed(() => this.state().textValues);
  readonly settings = computed(() => this.state().settings);
  readonly sectionToggles = computed(() => this.state().sectionToggles);
  readonly personalGoals = computed(() => this.state().personalGoals);
  readonly todoItems = computed(() => this.state().todoItems);
  readonly bigGoals = computed(() => this.state().bigGoals);
  readonly bigGoalsSeeded = computed(() => this.state().bigGoalsSeeded);

  readonly totalTrackable = computed(() => {
    const d = this.data();
    if (!d) return { completed: 0, total: 0 };

    const toggles = this.sectionToggles();
    const settings = this.settings();
    const checkboxes = this.state().checkboxes;

    const count = (prefix: string) =>
      Object.keys(checkboxes).filter(k => k.startsWith(prefix) && checkboxes[k]).length;

    const sections: [keyof SectionToggles, number, string][] = [
      ['quests',      d.quests?.length ?? 0,             'quest:'],
      ['gear',        this.gearTotal(d, settings),        'gear:'],
      ['lichGear',    this.lichGearTotal(d),              'lich:'],
      ['incarnon',    this.incarnonTotal(d, settings),    'incarnon:'],
      ['arcanes',     this.arcaneTotal(d, settings),      'arcane:'],
      ['mods',        this.modTotal(d, settings),         'mod:'],
      ['subsume',     d.subsume?.length ?? 0,             'subsume:'],
      ['railjack',    this.rjTotal(d, settings),          'rj:'],
      ['relics',      this.relicTotal(d, settings),       'relic:'],
      ['blueprints',  this.bpTotal(d, settings),          'bp:'],
      ['items',       this.itemTotal(d),                  'item:'],
      ['cosmetics',   this.cosTotal(d, settings),         'cos:'],
      ['collectable', this.colTotal(d, settings),         'col:'],
      ['decorations', this.decTotal(d, settings),         'dec:'],
      ['codex',       this.codexTotal(d),                 'codex:'],
      ['market',      this.marketTotal(d),                'market:'],
      ['extra',       this.extraTotal(d),                 'extra:'],
      ['modularGear', this.modGearTotal(d),               'mod_gear:'],
    ];

    let completed = 0, total = 0;
    for (const [key, sectionTotal, prefix] of sections) {
      if (!toggles[key] || sectionTotal === 0) continue;
      completed += count(prefix);
      total += sectionTotal;
    }
    return { completed, total };
  });

  isChecked(key: string): boolean {
    return this.state().checkboxes[key] ?? false;
  }

  getNumber(key: string, defaultValue = 0): number {
    return this.state().numberValues[key] ?? defaultValue;
  }

  getText(key: string): string {
    return this.state().textValues[key] ?? '';
  }

  toggle(key: string): void {
    this.updateState(s => ({
      ...s,
      checkboxes: { ...s.checkboxes, [key]: !s.checkboxes[key] }
    }));
  }

  setNumber(key: string, value: number): void {
    this.updateState(s => ({
      ...s,
      numberValues: { ...s.numberValues, [key]: value }
    }));
  }

  setText(key: string, value: string): void {
    this.updateState(s => ({
      ...s,
      textValues: { ...s.textValues, [key]: value }
    }));
  }

  updateSettings(settings: TrackerSettings): void {
    this.updateState(s => ({ ...s, settings }));
  }

  updatePinnedBarSettings(pinnedBar: PinnedBarSettings): void {
    this.updateState(s => ({ ...s, settings: { ...s.settings, pinnedBar } }));
  }

  updateSectionToggles(toggles: SectionToggles): void {
    this.updateState(s => ({ ...s, sectionToggles: toggles }));
  }

  addPersonalGoal(goal: PersonalGoal): void {
    this.updateState(s => ({ ...s, personalGoals: [...s.personalGoals, goal] }));
  }

  updatePersonalGoal(goal: PersonalGoal): void {
    this.updateState(s => ({
      ...s,
      personalGoals: s.personalGoals.map(g => g.id === goal.id ? goal : g)
    }));
  }

  deletePersonalGoal(id: string): void {
    this.updateState(s => ({
      ...s,
      personalGoals: s.personalGoals.filter(g => g.id !== id)
    }));
  }

  addTodoItem(text: string): void {
    const item: TodoItem = { id: crypto.randomUUID(), text, completed: false };
    this.updateState(s => ({ ...s, todoItems: [...s.todoItems, item] }));
  }

  updateTodoItem(item: TodoItem): void {
    this.updateState(s => ({
      ...s,
      todoItems: s.todoItems.map(t => t.id === item.id ? item : t)
    }));
  }

  deleteTodoItem(id: string): void {
    this.updateState(s => ({
      ...s,
      todoItems: s.todoItems.filter(t => t.id !== id)
    }));
  }

  countProgress(keys: string[]): { completed: number; total: number; percentage: number } {
    const checkboxes = this.state().checkboxes;
    const completed = keys.filter(k => checkboxes[k]).length;
    const total = keys.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  }

  exportState(): string {
    return JSON.stringify(this.state());
  }

  importState(json: string): void {
    try {
      const parsed: unknown = JSON.parse(json);
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.error('Failed to import state: expected a JSON object');
        return;
      }
      this.updateState(() => this.mergeWithDefaults(parsed as Partial<TrackerState>));
    } catch (e) {
      console.error('Failed to import state', e);
    }
  }

  resetSection(keyPrefix: string): void {
    this.updateState(s => {
      const checkboxes = { ...s.checkboxes };
      Object.keys(checkboxes).forEach(k => {
        if (k.startsWith(keyPrefix)) delete checkboxes[k];
      });
      return { ...s, checkboxes };
    });
  }

  addBigGoal(text: string): void {
    this.updateState(s => ({ ...s, bigGoals: [...s.bigGoals, text], bigGoalsSeeded: true }));
  }

  deleteBigGoal(text: string): void {
    this.updateState(s => ({ ...s, bigGoals: s.bigGoals.filter(g => g !== text), bigGoalsSeeded: true }));
  }

  setBigGoals(goals: string[]): void {
    this.updateState(s => ({ ...s, bigGoals: goals, bigGoalsSeeded: true }));
  }

  markBigGoalsSeeded(): void {
    this.updateState(s => ({ ...s, bigGoalsSeeded: true }));
  }

  // ─── Per-section total calculations (mirror the dashboard, kept in sync) ──────

  private gearTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.gear) return 0;
    const primeOnly = settings.gear.primeOnlyGear;
    const isFounder = settings.isFounder;
    const activeCols = ALL_GEAR_COLUMNS.filter(
      c => !c.settingKey || (settings.gear as unknown as Record<string, unknown>)[c.settingKey]
    );
    let total = 0;
    for (const [sectionKey, items] of Object.entries(d.gear)) {
      const allowed = GEAR_SECTION_COLUMNS[sectionKey] ?? ['mastery'];
      const sectionCols = activeCols.filter(c => allowed.includes(c.key));
      const filtered = isFounder ? items : items.filter(i => !i.isFounderOnly);

      if (!primeOnly) {
        total += filtered.length * sectionCols.length;
        continue;
      }

      const upgradeCols = sectionCols.filter(c => c.key !== 'mastery').map(c => c.key);
      total += countGearSection(filtered.map(i => i.name), upgradeCols, () => false).total;
    }
    return total;
  }

  private lichGearTotal(d: TrackerData): number {
    if (!d.lichGear) return 0;
    return Object.values(d.lichGear).reduce((a, v) => a + v.length, 0) * 3;
  }

  private incarnonTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.incarnon) return 0;
    const completionist = settings.incarnon.completionist;
    const rows = d.incarnon.reduce((a: number, f: IncarnonEntry) =>
      a + (completionist || f.name === '1 FAMILY' ? f.weapons.length : 1), 0);
    return rows * 3;
  }

  private arcaneTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.arcanes) return 0;
    const base = Object.values(d.arcanes).reduce((a, v) => a + v.length, 0);
    return settings.arcane.psycho ? base * 5 : base;
  }

  private modTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.mods) return 0;
    if (settings.mod.hoarder) return d.mods.reduce((a, m) => a + m.maxRank + 1, 0);
    return d.mods.length;
  }

  private rjTotal(d: TrackerData, settings: TrackerSettings): number {
    const intrinsics = d.railjack?.intrinsics?.length ?? 0;
    const components = d.railjack?.components ?? [];
    if (settings.railjack.partHoarder) return intrinsics + components.length;
    const unique = new Set(components.map((c: { house: string; component: string }) => c.house + ':' + c.component));
    return intrinsics + unique.size;
  }

  private relicTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.relics) return 0;
    const base = Object.values(d.relics).reduce((a, v) => a + v.length, 0);
    return settings.relic.hoarder ? base * 4 : base;
  }

  private bpTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.blueprints) return 0;
    const showOld = settings.blueprint.hoarder;
    let t = 0;
    for (const cat of Object.values(d.blueprints)) {
      for (const items of Object.values(cat)) {
        t += showOld ? items.length : items.filter(i => !i.isOld).length;
      }
    }
    return t;
  }

  private itemTotal(d: TrackerData): number {
    if (!d.items) return 0;
    return Object.values(d.items).reduce((a, v) => a + v.length, 0);
  }

  private cosTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.cosmetics) return 0;
    const s = settings.cosmetics;
    let t = 0;
    for (const [cat, subs] of Object.entries(d.cosmetics)) {
      if (cat === 'TENNOGEN' && !s.tennogen) continue;
      for (const [sub, items] of Object.entries(subs)) {
        if (cat === 'TENNOGEN' && sub === 'CONSOLE' && !s.consoleExclusive) continue;
        if (cat === 'REMAINING COSMETICS' && sub === 'Extra' && !s.extra) continue;
        t += items.length;
      }
    }
    return t;
  }

  private colTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.collectable) return 0;
    const s = settings.collectable;
    return Object.entries(d.collectable).reduce((a, [key, v]) =>
      a + (key === 'OLD IMPOSSIBLE GLYPHS' && !s.old ? 0 : v.length), 0);
  }

  private decTotal(d: TrackerData, settings: TrackerSettings): number {
    if (!d.decorations) return 0;
    const s = settings.decorations;
    return Object.entries(d.decorations).reduce((a, [key, v]) =>
      a + (key === 'Tennocon Locked' && !s.extra ? 0 : v.length), 0);
  }

  private codexTotal(d: TrackerData): number {
    if (!d.codex) return 0;
    return Object.values(d.codex).reduce((a, v) => a + v.length, 0);
  }

  private marketTotal(d: TrackerData): number {
    if (!d.market) return 0;
    return Object.values(d.market).reduce((a, v) => a + v.length, 0);
  }

  private extraTotal(d: TrackerData): number {
    if (!d.extra) return 0;
    return Object.values(d.extra).reduce((a, v) => a + v.length, 0);
  }

  private modGearTotal(d: TrackerData): number {
    if (!d.modularGear) return 0;
    return Object.values(d.modularGear).reduce((a, v) => a + v.length, 0);
  }

  // ─── Internal state helpers ───────────────────────────────────────────────────

  private updateState(fn: (s: TrackerState) => TrackerState): void {
    this.state.update(fn);
    this.saveState(this.state());
  }

  private saveState(state: TrackerState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }

  private loadState(): TrackerState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return this.mergeWithDefaults(JSON.parse(raw));
    } catch (e) {
      console.warn('Failed to load state from localStorage', e);
    }
    return this.defaultState();
  }

  private defaultState(): TrackerState {
    return {
      checkboxes: {},
      numberValues: {},
      textValues: {},
      settings: { ...DEFAULT_SETTINGS },
      sectionToggles: { ...DEFAULT_SECTION_TOGGLES },
      personalGoals: [],
      todoItems: [],
      bigGoals: [],
      bigGoalsSeeded: false
    };
  }

  private mergeWithDefaults(partial: Partial<TrackerState>): TrackerState {
    const defaults = this.defaultState();
    const ps: Partial<TrackerSettings> = partial.settings ?? {};
    const ds = defaults.settings;
    return {
      checkboxes: partial.checkboxes ?? {},
      numberValues: partial.numberValues ?? {},
      textValues: partial.textValues ?? {},
      settings: {
        ...ds, ...ps,
        gear: { ...ds.gear, ...(ps.gear ?? {}) },
        incarnon: { ...ds.incarnon, ...(ps.incarnon ?? {}) },
        arcane: { ...ds.arcane, ...(ps.arcane ?? {}) },
        mod: { ...ds.mod, ...(ps.mod ?? {}) },
        railjack: { ...ds.railjack, ...(ps.railjack ?? {}) },
        relic: { ...ds.relic, ...(ps.relic ?? {}) },
        blueprint: { ...ds.blueprint, ...(ps.blueprint ?? {}) },
        cosmetics: { ...ds.cosmetics, ...(ps.cosmetics ?? {}) },
        collectable: { ...ds.collectable, ...(ps.collectable ?? {}) },
        decorations: { ...ds.decorations, ...(ps.decorations ?? {}) },
        codex: { ...ds.codex, ...(ps.codex ?? {}) },
        market: { ...ds.market, ...(ps.market ?? {}) },
        extra: { ...ds.extra, ...(ps.extra ?? {}) },
        pinnedBar: { ...ds.pinnedBar, ...(ps.pinnedBar ?? {}) },
      },
      sectionToggles: { ...defaults.sectionToggles, ...partial.sectionToggles },
      personalGoals: partial.personalGoals ?? [],
      todoItems: partial.todoItems ?? [],
      bigGoals: partial.bigGoals ?? [],
      bigGoalsSeeded: partial.bigGoalsSeeded ?? (partial.bigGoals?.length ?? 0) > 0
    };
  }
}
