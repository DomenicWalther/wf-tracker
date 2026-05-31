import { Component, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  label: string;
  description?: string;
  prereq?: string;
  location?: string;
  info?: string;
  isParent?: true;
  subtasks?: Task[];
}

interface TaskSection {
  id: string;
  title: string;
  resetType: 'daily' | 'weekly' | 'other';
  tasks: Task[];
}

interface TaskState {
  dailyDate: string;
  weeklyDate: string;
  checked: Record<string, boolean>;
  hidden: string[];       // task IDs the user has hidden
  collapsed: string[];    // parent group IDs that are collapsed
  showHidden: string[];   // section IDs where hidden-tasks panel is open
}

// ─── Task Data ────────────────────────────────────────────────────────────────

const SECTIONS: TaskSection[] = [
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

// ─── Date helpers (UTC — matches Warframe reset) ──────────────────────────────

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

function timeUntilDaily(): string {
  const n = new Date();
  const ms = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1)).getTime() - n.getTime();
  return `${Math.floor(ms / 3_600_000)}h ${Math.floor((ms % 3_600_000) / 60_000)}m`;
}

function timeUntilWeekly(): string {
  const n = new Date();
  const day = n.getUTCDay();
  const daysLeft = day === 0 ? 1 : 8 - day;
  const ms = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + daysLeft)).getTime() - n.getTime();
  return `${Math.floor(ms / 86_400_000)}d ${Math.floor((ms % 86_400_000) / 3_600_000)}h`;
}

// ─── Helpers for all leaf IDs in a section ───────────────────────────────────

function allLeafIds(sectionId: string, tasks: Task[]): string[] {
  return tasks.flatMap(t =>
    t.isParent && t.subtasks ? t.subtasks.map(s => `${sectionId}:${s.id}`) : [`${sectionId}:${t.id}`]
  );
}

// ─── localStorage ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'wf-task-checklist';

function loadState(): TaskState {
  const defaults: TaskState = { dailyDate: '', weeklyDate: '', checked: {}, hidden: [], collapsed: [], showHidden: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<TaskState>;
      return { ...defaults, ...parsed };
    }
  } catch { /* ignore */ }
  return defaults;
}

function saveState(s: TaskState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
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

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-task-checklist',
  imports: [SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="TASK CHECKLIST"
        description="Track your daily, weekly, and periodic Warframe tasks. Daily tasks reset at 00:00 UTC; weekly tasks reset every Monday at 00:00 UTC."
        [completed]="totalCompleted()"
        [total]="totalVisible()"
      />

      <p class="hint">
        Remember: you don't have to do everything — prioritize tasks based on your current goals.
        <span class="hint-dim">Tasks you don't want to see can be hidden individually.</span>
      </p>

      @for (section of sections; track section.id) {
        <section class="task-section" [attr.aria-labelledby]="section.id + '-heading'">

          <!-- ── Section header ── -->
          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title" [id]="section.id + '-heading'">{{ section.title }}</h2>
              <span class="reset-badge" [class]="'reset-badge ' + section.resetType">
                @if (section.resetType === 'daily')  { Resets in {{ dailyReset() }} }
                @if (section.resetType === 'weekly') { Resets in {{ weeklyReset() }} }
                @if (section.resetType === 'other')  { Manual }
              </span>
            </div>
            <div class="section-meta">
              <span class="section-count">{{ sectionCompleted(section) }}/{{ sectionTotal(section) }} completed</span>
              <button class="reset-btn" type="button" (click)="resetSection(section)" [attr.aria-label]="'Reset ' + section.title">
                Reset
              </button>
            </div>
            <div class="progress-bar-bg" role="progressbar"
                 [attr.aria-valuenow]="sectionCompleted(section)"
                 [attr.aria-valuemax]="sectionTotal(section)"
                 [attr.aria-label]="section.title + ' progress'">
              <div class="progress-bar-fill" [style.width.%]="sectionPct(section)"></div>
            </div>
          </div>

          <!-- ── Task list ── -->
          <ul class="task-list" role="list">
            @for (task of visibleTopLevel(section); track task.id) {
              @if (task.isParent) {
                <!-- Parent / group row -->
                <li class="group-item">
                  <div class="group-header">
                    <button
                      class="collapse-toggle"
                      type="button"
                      [attr.aria-expanded]="!isCollapsed(task.id)"
                      [attr.aria-label]="(isCollapsed(task.id) ? 'Expand ' : 'Collapse ') + task.label"
                      (click)="toggleCollapse(task.id)"
                    >
                      <span aria-hidden="true">{{ isCollapsed(task.id) ? '▶' : '▼' }}</span>
                    </button>
                    <span class="group-label">{{ task.label }}</span>
                    <span class="group-sub-count" aria-hidden="true">
                      {{ subtaskCompleted(section, task) }}/{{ subtaskVisible(section, task) }}
                    </span>
                    <button
                      class="hide-btn"
                      type="button"
                      (click)="hideTask(task.id)"
                      title="Hide this group"
                      aria-label="Hide group {{ task.label }}"
                    >Hide</button>
                  </div>

                  @if (!isCollapsed(task.id) && task.subtasks) {
                    <ul class="subtask-list" role="list">
                      @for (sub of visibleSubtasks(section, task); track sub.id) {
                        <li class="task-item subtask" [class.task-done]="isChecked(section.id, sub.id)">
                          <label class="task-label">
                            <input
                              type="checkbox"
                              class="task-checkbox"
                              [checked]="isChecked(section.id, sub.id)"
                              (change)="toggle(section.id, sub.id)"
                              [attr.aria-label]="sub.label"
                            />
                            <span class="task-name">{{ sub.label }}</span>
                            @if (sub.location) {
                              <span class="task-meta">📍 {{ sub.location }}</span>
                            }
                            @if (sub.prereq) {
                              <span class="task-prereq">Req: {{ sub.prereq }}</span>
                            }
                          </label>
                          <button
                            class="hide-btn"
                            type="button"
                            (click)="hideTask(sub.id)"
                            title="Hide this task"
                            [attr.aria-label]="'Hide task: ' + sub.label"
                          >Hide</button>
                        </li>
                      }
                    </ul>
                  }
                </li>
              } @else {
                <!-- Regular task row -->
                <li class="task-item" [class.task-done]="isChecked(section.id, task.id)">
                  <label class="task-label">
                    <input
                      type="checkbox"
                      class="task-checkbox"
                      [checked]="isChecked(section.id, task.id)"
                      (change)="toggle(section.id, task.id)"
                      [attr.aria-label]="task.label"
                    />
                    <span class="task-name">{{ task.label }}</span>
                    @if (task.description) {
                      <span class="task-desc">{{ task.description }}</span>
                    }
                    @if (task.location) {
                      <span class="task-meta">📍 {{ task.location }}</span>
                    }
                    @if (task.prereq) {
                      <span class="task-prereq">Req: {{ task.prereq }}</span>
                    }
                  </label>
                  <button
                    class="hide-btn"
                    type="button"
                    (click)="hideTask(task.id)"
                    title="Hide this task"
                    [attr.aria-label]="'Hide task: ' + task.label"
                  >Hide</button>
                </li>
              }
            }
          </ul>

          <!-- ── Hidden tasks panel ── -->
          @if (hiddenInSection(section).length > 0) {
            <div class="hidden-panel">
              <button
                class="hidden-toggle"
                type="button"
                [attr.aria-expanded]="isShowingHidden(section.id)"
                (click)="toggleShowHidden(section.id)"
              >
                <span aria-hidden="true">{{ isShowingHidden(section.id) ? '▾' : '▸' }}</span>
                {{ hiddenInSection(section).length }} hidden task{{ hiddenInSection(section).length === 1 ? '' : 's' }}
              </button>

              @if (isShowingHidden(section.id)) {
                <ul class="hidden-list" role="list">
                  @for (item of hiddenInSection(section); track item.id) {
                    <li class="hidden-item">
                      <span class="hidden-item-label">{{ item.label }}</span>
                      <button
                        class="restore-btn"
                        type="button"
                        (click)="restoreTask(item.id)"
                        [attr.aria-label]="'Restore task: ' + item.label"
                      >Restore</button>
                    </li>
                  }
                </ul>
              }
            </div>
          }

        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 860px; }

    .hint {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: -8px 0 24px;
      font-style: italic;
    }
    .hint-dim { opacity: 0.65; margin-left: 6px; }

    /* ── Section ── */
    .task-section {
      margin-bottom: 28px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .section-header {
      padding: 12px 16px;
      background: var(--color-surface2);
      border-bottom: 1px solid var(--color-border);
    }
    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }
    .section-title {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-gold);
    }
    .reset-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .reset-badge.daily  { border-color: #3a6a8a; color: #7fb8d8; }
    .reset-badge.weekly { border-color: #6a4a90; color: #b89ad8; }

    .section-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .section-count { font-size: 11px; color: var(--color-text-muted); }

    .reset-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .reset-btn:hover { border-color: var(--color-gold); color: var(--color-gold); }

    .progress-bar-bg {
      height: 3px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: var(--color-gold);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    /* ── Task list ── */
    .task-list { list-style: none; margin: 0; padding: 0; }

    /* ── Regular task row ── */
    .task-item {
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      transition: background 0.1s;
    }
    .task-item:last-child { border-bottom: none; }
    .task-item:hover { background: var(--color-surface2); }
    .task-item.task-done { opacity: 0.5; }

    .task-label {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 10px;
      padding: 9px 14px;
      cursor: pointer;
      flex: 1;
    }

    .task-checkbox {
      flex-shrink: 0;
      accent-color: var(--color-gold);
      width: 14px;
      height: 14px;
      cursor: pointer;
      align-self: center;
    }

    .task-name {
      font-size: 13px;
      color: var(--color-text);
      font-weight: 500;
    }
    .task-done .task-name { text-decoration: line-through; color: var(--color-text-muted); }

    .task-desc {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .task-meta {
      font-size: 10px;
      color: var(--color-text-muted);
      opacity: 0.75;
    }

    .task-prereq {
      font-size: 10px;
      color: #8a6a30;
      background: #1e1a10;
      border: 1px solid #3a3010;
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* ── Hide button ── */
    .hide-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 10px;
      padding: 4px 10px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .task-item:hover .hide-btn,
    .group-header:hover .hide-btn { opacity: 1; }
    .hide-btn:hover { color: #c06060; opacity: 1; }

    /* ── Parent / group row ── */
    .group-item { border-bottom: 1px solid var(--color-border); }
    .group-item:last-child { border-bottom: none; }

    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      background: color-mix(in srgb, var(--color-surface2) 60%, transparent);
    }
    .group-header:hover { background: var(--color-surface2); }

    .collapse-toggle {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 10px;
      cursor: pointer;
      padding: 2px 4px;
      line-height: 1;
    }
    .collapse-toggle:hover { color: var(--color-gold); }

    .group-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-gold-light, var(--color-gold));
      flex: 1;
    }

    .group-sub-count {
      font-size: 10px;
      color: var(--color-text-muted);
      margin-right: 4px;
    }

    /* ── Subtask rows ── */
    .subtask-list { list-style: none; margin: 0; padding: 0; }
    .subtask { padding-left: 16px; }
    .subtask .task-label { padding-left: 28px; }

    /* ── Hidden tasks panel ── */
    .hidden-panel {
      border-top: 1px dashed var(--color-border);
      padding: 8px 16px;
      background: color-mix(in srgb, var(--color-surface2) 40%, transparent);
    }

    .hidden-toggle {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 11px;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hidden-toggle:hover { color: var(--color-text); }

    .hidden-list {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hidden-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .hidden-item-label { flex: 1; }

    .restore-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 10px;
      padding: 1px 8px;
      border-radius: 3px;
      cursor: pointer;
    }
    .restore-btn:hover { border-color: var(--color-gold); color: var(--color-gold); }
  `]
})
export class TaskChecklistComponent implements OnInit {
  readonly sections = SECTIONS;

  private readonly st = signal<TaskState>({
    dailyDate: '', weeklyDate: '', checked: {}, hidden: [], collapsed: [], showHidden: []
  });

  readonly dailyReset  = signal(timeUntilDaily());
  readonly weeklyReset = signal(timeUntilWeekly());

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    const s = applyAutoReset(loadState());
    this.st.set(s);
    saveState(s);
  }

  // ── Total progress (across all sections, excluding hidden) ─────────────────

  readonly totalVisible = computed(() =>
    SECTIONS.reduce((sum, sec) => sum + this.sectionTotal(sec), 0)
  );
  readonly totalCompleted = computed(() =>
    SECTIONS.reduce((sum, sec) => sum + this.sectionCompleted(sec), 0)
  );

  // ── Per-section helpers ────────────────────────────────────────────────────

  sectionTotal(section: TaskSection): number {
    const hidden = this.st().hidden;
    return section.tasks.reduce((sum, t) => {
      if (hidden.includes(t.id)) return sum;
      if (t.isParent && t.subtasks) {
        return sum + t.subtasks.filter(s => !hidden.includes(s.id)).length;
      }
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

  // ── Per-parent-group helpers ───────────────────────────────────────────────

  subtaskVisible(section: TaskSection, parent: Task): number {
    const hidden = this.st().hidden;
    return (parent.subtasks ?? []).filter(s => !hidden.includes(s.id)).length;
  }

  subtaskCompleted(section: TaskSection, parent: Task): number {
    const { checked, hidden } = this.st();
    return (parent.subtasks ?? []).filter(s => !hidden.includes(s.id) && checked[`${section.id}:${s.id}`]).length;
  }

  // ── Visibility ─────────────────────────────────────────────────────────────

  visibleTopLevel(section: TaskSection): Task[] {
    const hidden = this.st().hidden;
    return section.tasks.filter(t => !hidden.includes(t.id));
  }

  visibleSubtasks(section: TaskSection, parent: Task): Task[] {
    const hidden = this.st().hidden;
    return (parent.subtasks ?? []).filter(s => !hidden.includes(s.id));
  }

  // ── Checkbox ───────────────────────────────────────────────────────────────

  isChecked(sectionId: string, taskId: string): boolean {
    return this.st().checked[`${sectionId}:${taskId}`] ?? false;
  }

  toggle(sectionId: string, taskId: string): void {
    this.mutate(s => {
      const key = `${sectionId}:${taskId}`;
      return { ...s, checked: { ...s.checked, [key]: !s.checked[key] } };
    });
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  resetSection(section: TaskSection): void {
    this.mutate(s => {
      const checked = { ...s.checked };
      allLeafIds(section.id, section.tasks).forEach(k => delete checked[k]);
      return { ...s, checked };
    });
  }

  // ── Hide / restore ─────────────────────────────────────────────────────────

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

  // ── Collapse ───────────────────────────────────────────────────────────────

  isCollapsed(id: string): boolean {
    return this.st().collapsed.includes(id);
  }

  toggleCollapse(id: string): void {
    this.mutate(s => ({
      ...s,
      collapsed: s.collapsed.includes(id) ? s.collapsed.filter(c => c !== id) : [...s.collapsed, id]
    }));
  }

  // ── Show-hidden panel ──────────────────────────────────────────────────────

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

  // ── Internal ───────────────────────────────────────────────────────────────

  private mutate(fn: (s: TaskState) => TaskState): void {
    this.st.update(s => { const next = fn(s); saveState(next); return next; });
  }
}
