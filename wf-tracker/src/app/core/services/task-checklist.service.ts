import { Injectable, signal, computed, OnDestroy } from '@angular/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Task {
  id: string;
  label: string;
  description?: string;
  prereq?: string;
  location?: string;
  info?: string;
  isParent?: true;
  subtasks?: Task[];
}

export interface TaskSection {
  id: string;
  title: string;
  resetType: 'daily' | 'weekly' | 'other';
  tasks: Task[];
}

export interface TaskState {
  dailyDate: string;
  weeklyDate: string;
  checked: Record<string, boolean>;
  hidden: string[];
  collapsed: string[];
  showHidden: string[];
}

export interface IncompleteTask {
  sectionId: string;
  sectionTitle: string;
  taskId: string;
  label: string;
}

export interface PinnedTaskItem {
  type: 'task';
  sectionId: string;
  taskId: string;
  label: string;
}

export interface PinnedTaskGroup {
  type: 'group';
  groupId: string;
  label: string;
  sectionId: string;
  subtasks: { taskId: string; label: string }[];
  completedCount: number;
  totalVisible: number;
}

export type PinnedEntry = PinnedTaskItem | PinnedTaskGroup;

// ─── Task data ────────────────────────────────────────────────────────────────

export const SECTIONS: TaskSection[] = [
  {
    id: 'daily', title: 'Daily Tasks', resetType: 'daily',
    tasks: [
      { id: 'daily_login',          label: 'Log In',                    description: 'Collect the daily login reward.' },
      { id: 'daily_craft_forma',    label: 'Crafting (Forma)',           description: 'Start building a new Forma (and collect finished ones).', location: 'Foundry' },
      { id: 'daily_craft_other',    label: 'Crafting (Other)',           description: 'Craft daily resources/items using reusable blueprints.', location: 'Foundry' },
      { id: 'daily_syndicate_gain', label: 'Faction Syndicates',        description: 'Gain daily standing cap with your pledged Syndicate(s).' },
      { id: 'daily_syndicate_spend',label: 'Faction Syndicates (Spend)',description: 'If maxed on standing, spend it (Relic packs, Vosfor packs, etc.).', location: 'Syndicates Terminal' },
      {
        id: 'daily_world_syndicates', label: 'World Syndicates (Standing)', isParent: true,
        subtasks: [
          { id: 'daily_world_syndicate_simaris',   label: 'Cephalon Simaris', location: 'Any Relay' },
          { id: 'daily_world_syndicate_ostron',    label: 'Ostron',           location: 'Cetus, Earth',               prereq: "Saya's Vigil" },
          { id: 'daily_world_syndicate_quills',    label: 'The Quills',       location: 'Cetus, Earth',               prereq: 'The War Within' },
          { id: 'daily_world_syndicate_solaris',   label: 'Solaris United',   location: 'Fortuna, Venus',             prereq: 'Vox Solaris (Quest)' },
          { id: 'daily_world_syndicate_vox',       label: 'Vox Solaris',      location: 'Fortuna, Venus',             prereq: 'The War Within' },
          { id: 'daily_world_syndicate_ventkids',  label: 'Ventkids',         location: 'Fortuna, Venus',             prereq: 'Vox Solaris (Quest)' },
          { id: 'daily_world_syndicate_entrati',   label: 'Entrati',          location: 'Necralisk, Deimos',          prereq: 'Heart of Deimos' },
          { id: 'daily_world_syndicate_necraloid', label: 'Necraloid',        location: 'Necralisk, Deimos',          prereq: 'The War Within' },
          { id: 'daily_world_syndicate_holdfasts', label: 'The Holdfasts',    location: 'Chrysalith, Zariman',        prereq: 'Angels of the Zariman' },
          { id: 'daily_world_syndicate_cavia',     label: 'Cavia',            location: 'Sanctum Anatomica, Deimos',  prereq: 'Whispers in the Walls' },
          { id: 'daily_world_syndicate_hex',       label: 'The Hex',          location: 'Höllvania Central Mall',     prereq: 'The Hex (Quest)' },
        ]
      },
      { id: 'daily_dark_sector',  label: 'Dark Sector Mission',     description: 'Complete one Dark Sector mission for double credits (if needed & pre-Index).', location: 'Navigation' },
      { id: 'daily_sortie',       label: 'Sortie',                  description: 'Complete the 3 daily Sortie missions.',                          location: 'Navigation',   prereq: 'The War Within' },
      { id: 'daily_focus',        label: 'Focus',                   description: 'Max out daily Focus gain (e.g., via Sanctuary Onslaught).',      prereq: 'The Second Dream' },
      { id: 'daily_steel_path',   label: 'Steel Path Incursions',   description: 'Complete daily Steel Path missions for Steel Essence.',          prereq: 'Steel Path unlocked' },
      {
        id: 'daily_vendors', label: 'Vendors', isParent: true,
        subtasks: [
          { id: 'daily_acrithis',    label: 'Acrithis', description: 'Check daily Arcane and Captura offering.',        location: 'Duviri/Dormizone' },
          { id: 'daily_ticker_crew', label: 'Ticker',   description: 'Check available railjack crew to hire.',           location: 'Fortuna, Venus', prereq: 'Rising Tide & Command Intrinsics 1' },
          { id: 'daily_marie',       label: 'Marie',    description: 'Purchase Operator and amp mods.',                  location: 'La Cathédrale, Deimos', prereq: 'The Old Peace' },
        ]
      },
    ]
  },
  {
    id: 'weekly', title: 'Weekly Tasks', resetType: 'weekly',
    tasks: [
      { id: 'weekly_nightwave_complete', label: 'Nightwave',              description: 'Complete relevant weekly Nightwave missions.' },
      { id: 'weekly_nightwave_spend',    label: 'Nightwave (Spend)',       description: 'Spend Nightwave credits if needed (Aura mods, Catalysts/Reactors, etc.).' },
      { id: 'weekly_ayatan',             label: 'Ayatan Treasure Hunt',   description: "Complete Maroo's weekly mission for an Ayatan Sculpture.", location: "Maroo's Bazaar, Mars" },
      { id: 'weekly_clem',               label: 'Help Clem',              description: 'Help Clem with his weekly survival, or he will die.',       location: 'Any Relay', prereq: 'A Man of Few Words' },
      { id: 'weekly_kahl_garrison',      label: 'Break Narmer',           description: "Complete Kahl's weekly mission for Stock.",                 location: "Drifter's Camp, Earth", prereq: 'Veilbreaker' },
      { id: 'weekly_archon_hunt',        label: 'Archon Hunt',            description: 'Complete the weekly Archon Hunt for a guaranteed Archon Shard.', location: 'Navigation', prereq: 'The New War' },
      { id: 'weekly_duviri_circuit',     label: 'Duviri Circuit (Normal)',     description: 'Check weekly Warframe options & run Circuit if desired.',   prereq: 'The Duviri Paradox' },
      { id: 'weekly_duviri_circuit_sp',  label: 'Duviri Circuit (Steel Path)', description: 'Check weekly Incarnon Adapters & run Circuit if desired.', prereq: 'Steel Path unlocked & The Duviri Paradox' },
      {
        id: 'weekly_search_pulses', label: 'Search Pulses', description: 'Use 5 weekly search pulses on Netracells and Archimedeas.', isParent: true,
        subtasks: [
          { id: 'weekly_netracells', label: 'Netracells',                description: 'Complete up to 5 weekly Netracell missions for Archon Shard chances.', location: 'Sanctum Anatomica, Deimos', prereq: 'Whispers in the Walls',  info: 'Costs 1 Search Pulse per mission' },
          { id: 'weekly_eda',        label: 'Elite Deep Archimedea',     description: 'Attempt weekly Elite Deep Archimedea for Archon Shard chances (endgame).',      location: 'Sanctum Anatomica, Deimos', prereq: 'Rank 5 Cavia',            info: 'Costs 2 Search Pulses to unlock' },
          { id: 'weekly_eta',        label: 'Elite Temporal Archimedea', description: 'Attempt weekly Elite Temporal Archimedea for Archon Shard chances (endgame).', location: 'Höllvania Central Mall',     prereq: 'Rank 5 The Hex',          info: 'Costs 2 Search Pulses to unlock' },
        ]
      },
      { id: 'weekly_calendar',       label: '1999 Calendar',             description: 'Complete weekly Calendar tasks.',           location: 'POM-2 PC (Base of Operations)', prereq: 'The Hex' },
      { id: 'weekly_invigorations',  label: 'Helminth Invigorations',    description: 'Use weekly Helminth Invigorations.',        prereq: 'Rank 5 Entrati' },
      { id: 'weekly_descendia',      label: 'The Descendia (Normal)',    description: 'Weekly Tower gamemode for various resources.', location: 'Dark Refractory (Base of Operations)' },
      { id: 'weekly_descendia_sp',   label: 'The Descendia (Steel Path)', description: 'Weekly Tower gamemode for various resources.', location: 'Dark Refractory (Base of Operations)' },
      {
        id: 'weekly_vendors', label: 'Vendors', isParent: true,
        subtasks: [
          { id: 'weekly_iron_wake',  label: 'Paladino',           description: 'Trade Riven Slivers.',                                                    location: 'Iron Wake, Earth',          prereq: 'The Chains of Harrow' },
          { id: 'weekly_yonta',      label: 'Archimedian Yonta',  description: 'Buy weekly Kuva with Voidplumes.',                                         location: 'Chrysalith, Zariman',        prereq: 'Angels of the Zariman' },
          { id: 'weekly_acridies',   label: 'Acrithis',           description: 'Check wares and spend Pathos Clamps if desired.',                          location: 'Duviri/Dormizone',           prereq: 'The Duviri Paradox' },
          { id: 'weekly_teshin',     label: 'Teshin (Steel Path)', description: "Check Teshin's Steel Essence shop (Umbra Forma every 8 weeks).",          location: 'Any Relay',                  prereq: 'Steel Path unlocked' },
          { id: 'weekly_bird3',      label: 'Bird 3',             description: 'Buy the weekly Archon Shard for 30 000 Cavia Standing.',                   location: 'Sanctum Anatomica, Deimos', prereq: 'Rank 5 Cavia' },
          { id: 'weekly_nightcap',   label: 'Nightcap',           description: 'Trade Fergolyte for Kuva and an Ayatan Sculpture.',                        location: 'Fortuna, Venus',             prereq: 'The New War' },
        ]
      },
    ]
  },
  {
    id: 'other', title: 'Other / Periodic', resetType: 'other',
    tasks: [
      { id: 'other_baro',                label: "Baro Ki'Teer",       description: "Check Baro Ki'Teer's inventory and purchase desired items with Ducats.", location: 'Relay with Symbol' },
      { id: 'other_grandmother_tokens',  label: 'Mend the Family',   description: 'Purchase Family Tokens from Grandmother (every 8 hours).', location: 'Necralisk, Deimos',          prereq: 'Heart of Deimos' },
      { id: 'other_yonta_voidplumes',    label: 'Trade for Voidplumes', description: 'Trade with Yonta (every 8 hours).',                       location: 'Chrysalith, Zariman',        prereq: 'Angels of the Zariman' },
      { id: 'other_loid_voca',           label: 'Trade for Voca',     description: 'Trade with Loid (every 8 hours).',                          location: 'Sanctum Anatomica, Deimos', prereq: 'Whispers in the Walls' },
    ]
  }
];

// ─── Date helpers ─────────────────────────────────────────────────────────────

function todayUTC(): string {
  const n = new Date();
  return `${n.getUTCFullYear()}-${p2(n.getUTCMonth() + 1)}-${p2(n.getUTCDate())}`;
}

function weekStartUTC(): string {
  const n = new Date();
  const day = n.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + diff));
  return `${m.getUTCFullYear()}-${p2(m.getUTCMonth() + 1)}-${p2(m.getUTCDate())}`;
}

function p2(n: number): string { return String(n).padStart(2, '0'); }

export function timeUntilDaily(): string {
  const n = new Date();
  const ms = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)).getTime() - n.getTime();
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

export function timeUntilWeekly(): string {
  const n = new Date();
  const day = n.getUTCDay();
  const daysLeft = day === 0 ? 1 : 8 - day;
  const ms = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + daysLeft)).getTime() - n.getTime();
  return `${Math.floor(ms / 86_400_000)}d ${Math.floor((ms % 86_400_000) / 3_600_000)}h`;
}

function allLeafIds(sectionId: string, tasks: Task[]): string[] {
  return tasks.flatMap(t =>
    t.isParent && t.subtasks ? t.subtasks.map(s => `${sectionId}:${s.id}`) : [`${sectionId}:${t.id}`]
  );
}

// ─── localStorage ─────────────────────────────────────────────────────────────

export const CHECKLIST_STORAGE_KEY = 'wf-task-checklist';

function loadState(): TaskState {
  const defaults: TaskState = { dailyDate: '', weeklyDate: '', checked: {}, hidden: [], collapsed: [], showHidden: [] };
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TaskState>;
      return { ...defaults, ...parsed };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveState(s: TaskState): void {
  try { localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function applyAutoReset(s: TaskState): TaskState {
  const today = todayUTC();
  const week  = weekStartUTC();
  let checked = { ...s.checked };
  let changed = false;

  if (s.dailyDate !== today) {
    SECTIONS.filter(sec => sec.resetType === 'daily').forEach(sec =>
      allLeafIds(sec.id, sec.tasks).forEach(k => delete checked[k])
    );
    changed = true;
  }
  if (s.weeklyDate !== week) {
    SECTIONS.filter(sec => sec.resetType === 'weekly').forEach(sec =>
      allLeafIds(sec.id, sec.tasks).forEach(k => delete checked[k])
    );
    changed = true;
  }

  return changed
    ? { ...s, dailyDate: today, weeklyDate: week, checked }
    : { ...s, dailyDate: today, weeklyDate: week };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TaskChecklistService {
  readonly st = signal<TaskState>({ dailyDate: '', weeklyDate: '', checked: {}, hidden: [], collapsed: [], showHidden: [] });

  readonly dailyReset  = signal(timeUntilDaily());
  readonly weeklyReset = signal(timeUntilWeekly());

  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const s = applyAutoReset(loadState());
    this.st.set(s);
    saveState(s);
    this._timer = setInterval(() => {
      this.dailyReset.set(timeUntilDaily());
      this.weeklyReset.set(timeUntilWeekly());
    }, 30_000);
  }

  ngOnDestroy(): void {
    if (this._timer) clearInterval(this._timer);
  }

  // ── Totals ─────────────────────────────────────────────────────────────────

  sectionTotal(section: TaskSection): number {
    const hidden = this.st().hidden;
    return section.tasks.reduce((sum, t) => {
      if (hidden.includes(t.id)) return sum;
      if (t.isParent && t.subtasks) return sum + t.subtasks.filter(s => !hidden.includes(s.id)).length;
      return sum + 1;
    }, 0);
  }

  sectionCompleted(section: TaskSection): number {
    const { checked, hidden } = this.st();
    return section.tasks.reduce((sum, t) => {
      if (hidden.includes(t.id)) return sum;
      if (t.isParent && t.subtasks) {
        return sum + t.subtasks.filter(s => !hidden.includes(s.id) && checked[`${section.id}:${s.id}`]).length;
      }
      return sum + (checked[`${section.id}:${t.id}`] ? 1 : 0);
    }, 0);
  }

  sectionPct(section: TaskSection): number {
    const total = this.sectionTotal(section);
    return total > 0 ? (this.sectionCompleted(section) / total) * 100 : 0;
  }

  subtaskVisible(section: TaskSection, parent: Task): number {
    const hidden = this.st().hidden;
    return (parent.subtasks ?? []).filter(s => !hidden.includes(s.id)).length;
  }

  subtaskCompleted(section: TaskSection, parent: Task): number {
    const { checked, hidden } = this.st();
    return (parent.subtasks ?? []).filter(s => !hidden.includes(s.id) && checked[`${section.id}:${s.id}`]).length;
  }

  visibleTopLevel(section: TaskSection): Task[] {
    const hidden = this.st().hidden;
    return section.tasks.filter(t => !hidden.includes(t.id));
  }

  visibleSubtasks(section: TaskSection, parent: Task): Task[] {
    const hidden = this.st().hidden;
    return (parent.subtasks ?? []).filter(s => !hidden.includes(s.id));
  }

  isChecked(sectionId: string, taskId: string): boolean {
    return this.st().checked[`${sectionId}:${taskId}`] ?? false;
  }

  toggle(sectionId: string, taskId: string): void {
    this.mutate(s => {
      const key = `${sectionId}:${taskId}`;
      return { ...s, checked: { ...s.checked, [key]: !s.checked[key] } };
    });
  }

  resetSection(section: TaskSection): void {
    this.mutate(s => {
      const checked = { ...s.checked };
      allLeafIds(section.id, section.tasks).forEach(k => delete checked[k]);
      return { ...s, checked };
    });
  }

  hideTask(id: string): void {
    this.mutate(s => ({ ...s, hidden: [...s.hidden.filter(h => h !== id), id] }));
  }

  restoreTask(id: string): void {
    this.mutate(s => ({ ...s, hidden: s.hidden.filter(h => h !== id) }));
  }

  hiddenInSection(section: TaskSection): { id: string; label: string }[] {
    const hidden = this.st().hidden;
    const result: { id: string; label: string }[] = [];
    for (const t of section.tasks) {
      if (hidden.includes(t.id)) { result.push({ id: t.id, label: t.label }); continue; }
      if (t.isParent && t.subtasks) {
        t.subtasks.filter(s => hidden.includes(s.id)).forEach(s => result.push({ id: s.id, label: s.label }));
      }
    }
    return result;
  }

  isCollapsed(id: string): boolean {
    return this.st().collapsed.includes(id);
  }

  toggleCollapse(id: string): void {
    this.mutate(s => ({
      ...s,
      collapsed: s.collapsed.includes(id) ? s.collapsed.filter(c => c !== id) : [...s.collapsed, id]
    }));
  }

  isShowingHidden(sectionId: string): boolean {
    return this.st().showHidden.includes(sectionId);
  }

  toggleShowHidden(sectionId: string): void {
    this.mutate(s => ({
      ...s,
      showHidden: s.showHidden.includes(sectionId)
        ? s.showHidden.filter(id => id !== sectionId)
        : [...s.showHidden, sectionId]
    }));
  }

  /** Returns tasks for a section as PinnedEntry[], preserving parent groups. */
  pinnedEntries(sectionId: string): PinnedEntry[] {
    const { checked, hidden } = this.st();
    const section = SECTIONS.find(s => s.id === sectionId);
    if (!section) return [];
    const result: PinnedEntry[] = [];

    for (const task of section.tasks) {
      if (hidden.includes(task.id)) continue;

      if (task.isParent && task.subtasks) {
        const visibleSubs = task.subtasks.filter(s => !hidden.includes(s.id));
        if (!visibleSubs.length) continue;
        const completedCount = visibleSubs.filter(s => checked[`${sectionId}:${s.id}`]).length;
        // Only include group if it has any incomplete subtasks
        const incompleteSubs = visibleSubs.filter(s => !checked[`${sectionId}:${s.id}`]);
        if (!incompleteSubs.length) continue;
        result.push({
          type: 'group',
          groupId: task.id,
          label: task.label,
          sectionId,
          subtasks: incompleteSubs.map(s => ({ taskId: s.id, label: s.label })),
          completedCount,
          totalVisible: visibleSubs.length,
        });
      } else if (!checked[`${sectionId}:${task.id}`]) {
        result.push({ type: 'task', sectionId, taskId: task.id, label: task.label });
      }
    }
    return result;
  }

  /** Returns all incomplete, non-hidden leaf tasks across all sections. */
  incompleteTasks(): IncompleteTask[] {
    const { checked, hidden } = this.st();
    const result: IncompleteTask[] = [];
    for (const section of SECTIONS) {
      for (const task of section.tasks) {
        if (hidden.includes(task.id)) continue;
        if (task.isParent && task.subtasks) {
          for (const sub of task.subtasks) {
            if (!hidden.includes(sub.id) && !checked[`${section.id}:${sub.id}`]) {
              result.push({ sectionId: section.id, sectionTitle: section.title, taskId: sub.id, label: sub.label });
            }
          }
        } else if (!checked[`${section.id}:${task.id}`]) {
          result.push({ sectionId: section.id, sectionTitle: section.title, taskId: task.id, label: task.label });
        }
      }
    }
    return result;
  }

  private mutate(fn: (s: TaskState) => TaskState): void {
    this.st.update(s => { const next = fn(s); saveState(next); return next; });
  }
}
