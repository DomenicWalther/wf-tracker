import { Injectable, signal, computed } from '@angular/core';
import {
  TrackerState, TrackerSettings, SectionToggles, PersonalGoal, TodoItem,
  DEFAULT_SETTINGS, DEFAULT_SECTION_TOGGLES
} from '../models/tracker.models';

const STORAGE_KEY = 'wf-tracker-state';

@Injectable({ providedIn: 'root' })
export class TrackerService {
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

  // Set by dashboard when data loads to enable accurate sidebar progress
  readonly totalTrackable = signal<{ completed: number; total: number }>({ completed: 0, total: 0 });

  setOverallProgress(completed: number, total: number): void {
    this.totalTrackable.set({ completed, total });
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
      const parsed = JSON.parse(json);
      this.updateState(() => this.mergeWithDefaults(parsed));
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

  addBigGoal(text: string): void {
    this.updateState(s => ({ ...s, bigGoals: [...s.bigGoals, text], bigGoalsSeeded: true }));
  }

  deleteBigGoal(text: string): void {
    this.updateState(s => ({ ...s, bigGoals: s.bigGoals.filter(g => g !== text), bigGoalsSeeded: true }));
  }

  setBigGoals(goals: string[]): void {
    this.updateState(s => ({ ...s, bigGoals: goals, bigGoalsSeeded: true }));
  }

  /** Marks Big Goals as seeded without changing the list (used when the data file has none to seed). */
  markBigGoalsSeeded(): void {
    this.updateState(s => ({ ...s, bigGoalsSeeded: true }));
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
    return {
      checkboxes: partial.checkboxes ?? {},
      numberValues: partial.numberValues ?? {},
      textValues: partial.textValues ?? {},
      settings: { ...defaults.settings, ...partial.settings },
      sectionToggles: { ...defaults.sectionToggles, ...partial.sectionToggles },
      personalGoals: partial.personalGoals ?? [],
      todoItems: partial.todoItems ?? [],
      bigGoals: partial.bigGoals ?? [],
      // Legacy state predates this flag: if goals already exist, treat them as seeded
      // so an existing customized list is never overwritten by the data-file defaults.
      bigGoalsSeeded: partial.bigGoalsSeeded ?? (partial.bigGoals?.length ?? 0) > 0
    };
  }
}
