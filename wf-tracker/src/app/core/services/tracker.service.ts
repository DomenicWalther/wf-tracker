import { Injectable, signal, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { take } from 'rxjs';
import {
  TrackerState, TrackerSettings, SectionToggles, PersonalGoal, TodoItem,
  DEFAULT_SETTINGS, DEFAULT_SECTION_TOGGLES, PinnedBarSettings,
} from '../models/tracker.models';
import { DataService } from './data.service';
import { sectionProgress } from '../utils/section-progress';
import { HonoriaService } from './honoria.service';

const STORAGE_KEY = 'wf-tracker-state';

/** Sections counted by the canonical key-set engine (honoria is tracked separately). */
const TRACKABLE_SECTIONS: (keyof SectionToggles)[] = [
  'quests', 'gear', 'lichGear', 'incarnon', 'arcanes', 'mods', 'atragraph',
  'subsume', 'railjack', 'relics', 'blueprints', 'items', 'cosmetics',
  'collectable', 'decorations', 'codex', 'market', 'extra', 'modularGear',
];

@Injectable({ providedIn: 'root' })
export class TrackerService {
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());
  readonly honoria = inject(HonoriaService);
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

  constructor() {
    // One-time recovery: arcane checkboxes used to be stored groupless as
    // `arcane:<name>`; they're now `arcane:<group>:<name>`. Remap any surviving
    // old keys once the data (which maps arcane → group) is available, so
    // previously-tracked arcanes aren't silently lost. Runs once per load and
    // is a no-op when there's nothing legacy to migrate.
    this.dataService.getData().pipe(take(1)).subscribe(d => {
      if (d?.arcanes) this.migrateArcaneKeys(d.arcanes);
    });
  }

  readonly totalTrackable = computed(() => {
    const d = this.data();
    if (!d) return { completed: 0, total: 0 };

    const toggles = this.sectionToggles();
    const settings = this.settings();
    const isChecked = (key: string) => this.isChecked(key);

    let completed = 0, total = 0;
    for (const section of TRACKABLE_SECTIONS) {
      if (!toggles[section]) continue;
      const p = sectionProgress(section, d, settings, isChecked);
      completed += p.completed;
      total += p.total;
    }
    if (toggles.honoria) {
      completed += this.honoria.completed();
      total += this.honoria.total;
    }
    return { completed, total };
  });

  /** Canonical `{completed, total}` for a single section, used by the dashboard cards. */
  sectionProgress(section: keyof SectionToggles): { completed: number; total: number } {
    const d = this.data();
    if (!d) return { completed: 0, total: 0 };
    if (section === 'honoria') return { completed: this.honoria.completed(), total: this.honoria.total };
    return sectionProgress(section, d, this.settings(), key => this.isChecked(key));
  }

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

  // ─── Legacy data migration ────────────────────────────────────────────────────

  /**
   * Remaps legacy groupless arcane keys (`arcane:<name>[:suffix]`) onto the
   * current group-scoped scheme (`arcane:<group>:<name>[:suffix]`).
   *
   * A key is legacy when its 2nd `:`-segment is NOT a known arcane group, e.g.
   * `arcane:Energize` / `arcane:Energize:maxed`. Names that live in more than
   * one group (Deadhead, Dexterity, Merciless) are copied to every group so the
   * prior shared-checkbox state is preserved. Idempotent and a no-op once there
   * are no legacy keys left.
   */
  private migrateArcaneKeys(arcanes: Record<string, string[]>): void {
    const groupKeys = new Set(Object.keys(arcanes));
    const nameToGroups = new Map<string, string[]>();
    for (const [group, names] of Object.entries(arcanes)) {
      for (const name of names) {
        const list = nameToGroups.get(name) ?? [];
        list.push(group);
        nameToGroups.set(name, list);
      }
    }

    const checkboxes = this.state().checkboxes;
    const legacyKeys = Object.keys(checkboxes).filter(k => {
      if (!k.startsWith('arcane:')) return false;
      const parts = k.split(':');
      return parts.length >= 2 && !groupKeys.has(parts[1]);
    });
    if (legacyKeys.length === 0) return;

    this.updateState(s => {
      const next = { ...s.checkboxes };
      for (const key of legacyKeys) {
        const value = next[key];
        const parts = key.split(':');           // ['arcane', name, ...suffix]
        const name = parts[1];
        const suffix = parts.slice(2).join(':'); // '', 'maxed', 'r1'…
        for (const group of nameToGroups.get(name) ?? []) {
          const newKey = suffix ? `arcane:${group}:${name}:${suffix}` : `arcane:${group}:${name}`;
          next[newKey] = next[newKey] || value; // never downgrade an already-checked key
        }
        delete next[key];
      }
      return { ...s, checkboxes: next };
    });
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
        atragraph: { ...ds.atragraph, ...(ps.atragraph ?? {}) },
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
