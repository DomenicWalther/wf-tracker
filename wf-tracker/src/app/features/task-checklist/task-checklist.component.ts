import { Component, signal, computed, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

interface Task {
  id: string;
  label: string;
  description?: string;
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
}

const STORAGE_KEY = 'wf-task-checklist';

const SECTIONS: TaskSection[] = [
  {
    id: 'daily',
    title: 'Daily Tasks',
    resetType: 'daily',
    tasks: [
      { id: 'login',          label: 'Daily Tribute',              description: 'Claim your daily login reward' },
      { id: 'sortie',         label: 'Sortie',                     description: 'Complete the daily Sortie (3 missions)' },
      { id: 'simaris',        label: 'Simaris Synthesis',          description: "Complete Simaris's daily synthesis target" },
      { id: 'cetus',          label: 'Plains of Eidolon Bounties', description: 'Complete Cetus bounties (Earth)' },
      { id: 'fortuna',        label: 'Orb Vallis Bounties',        description: 'Complete Fortuna bounties (Venus)' },
      { id: 'deimos',         label: 'Cambion Drift Bounties',     description: 'Complete Necralisk bounties (Deimos)' },
      { id: 'zariman',        label: 'Zariman Bounties',           description: 'Complete Zariman Ten Zero bounties' },
      { id: 'duviri',         label: 'The Circuit',                description: 'Complete the Duviri Circuit' },
      { id: 'void-flood',     label: 'Void Flood / Cascade',       description: 'Complete a Void Flood or Void Cascade mission in Zariman' },
      { id: 'sp-incursions',  label: 'Steel Path Incursions',      description: 'Complete 3 daily Steel Path Incursion missions for Steel Essence' },
      { id: 'syn-meridian',   label: 'Steel Meridian Standing',    description: 'Farm Steel Meridian standing to daily cap' },
      { id: 'syn-hexis',      label: 'Arbiters of Hexis Standing', description: 'Farm Arbiters of Hexis standing to daily cap' },
      { id: 'syn-suda',       label: 'Cephalon Suda Standing',     description: 'Farm Cephalon Suda standing to daily cap' },
      { id: 'syn-perrin',     label: 'Perrin Sequence Standing',   description: 'Farm Perrin Sequence standing to daily cap' },
      { id: 'syn-loka',       label: 'New Loka Standing',          description: 'Farm New Loka standing to daily cap' },
      { id: 'syn-veil',       label: 'Red Veil Standing',          description: 'Farm Red Veil standing to daily cap' },
    ]
  },
  {
    id: 'weekly',
    title: 'Weekly Tasks',
    resetType: 'weekly',
    tasks: [
      { id: 'archon-hunt',       label: 'Archon Hunt',                  description: 'Complete the weekly Archon Hunt (3 missions) for Archon Shards' },
      { id: 'deep-arch',         label: 'Deep Archimedea',              description: 'Complete the weekly Deep Archimedea challenge for exclusive rewards' },
      { id: 'sp-circuit',        label: 'Steel Path Elite Circuit',     description: 'Complete the weekly Elite Steel Path Circuit' },
      { id: 'netracell-1',       label: 'Netracell — Run 1',            description: 'Complete 1st Netracell run (4 max per week, unlocks Archon Shards)' },
      { id: 'netracell-2',       label: 'Netracell — Run 2',            description: 'Complete 2nd Netracell run' },
      { id: 'netracell-3',       label: 'Netracell — Run 3',            description: 'Complete 3rd Netracell run' },
      { id: 'netracell-4',       label: 'Netracell — Run 4',            description: 'Complete 4th Netracell run' },
      { id: 'nightwave-weekly',  label: 'Nightwave: Weekly Acts',       description: 'Complete Nightwave weekly challenges' },
      { id: 'nightwave-elite',   label: 'Nightwave: Elite Acts',        description: 'Complete Nightwave elite weekly challenges' },
      { id: 'kahl',              label: "Kahl's Weekly Mission",         description: "Complete Veilbreaker's weekly Kahl mission for Stock" },
    ]
  },
  {
    id: 'other',
    title: 'Periodic / Other',
    resetType: 'other',
    tasks: [
      { id: 'baro',     label: "Baro Ki'Teer",              description: "Check Baro's wares — arrives every ~2 weeks on Fridays for 48 h" },
      { id: 'varzia',   label: 'Varzia / Prime Resurgence', description: "Check Prime Resurgence offerings at Maroo's Bazaar" },
      { id: 'lua-prey', label: "Lua's Prey Bounties",       description: 'Complete Lua bounties for Incarnon Genesis adapters' },
    ]
  }
];

// ─── date helpers (UTC, matches Warframe's reset) ─────────────────────────────

function todayUTC(): string {
  const n = new Date();
  return `${n.getUTCFullYear()}-${pad(n.getUTCMonth() + 1)}-${pad(n.getUTCDate())}`;
}

function weekStartUTC(): string {
  const n = new Date();
  const day = n.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + diff));
  return `${mon.getUTCFullYear()}-${pad(mon.getUTCMonth() + 1)}-${pad(mon.getUTCDate())}`;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function timeUntilDailyReset(): string {
  const n = new Date();
  const next = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1));
  const ms = next.getTime() - n.getTime();
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

function timeUntilWeeklyReset(): string {
  const n = new Date();
  const day = n.getUTCDay();
  const daysLeft = day === 0 ? 1 : 8 - day;
  const next = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + daysLeft));
  const ms = next.getTime() - n.getTime();
  return `${Math.floor(ms / 86400000)}d ${Math.floor((ms % 86400000) / 3600000)}h`;
}

// ─── state helpers ────────────────────────────────────────────────────────────

function loadState(): TaskState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TaskState;
  } catch { /* ignore */ }
  return { dailyDate: '', weeklyDate: '', checked: {} };
}

function saveState(s: TaskState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

function applyAutoReset(s: TaskState): TaskState {
  const today = todayUTC();
  const weekStart = weekStartUTC();
  const dailyIds = SECTIONS.find(s => s.id === 'daily')!.tasks.map(t => `daily:${t.id}`);
  const weeklyIds = SECTIONS.find(s => s.id === 'weekly')!.tasks.map(t => `weekly:${t.id}`);

  let checked = { ...s.checked };
  let changed = false;

  if (s.dailyDate !== today) {
    dailyIds.forEach(k => delete checked[k]);
    changed = true;
  }
  if (s.weeklyDate !== weekStart) {
    weeklyIds.forEach(k => delete checked[k]);
    changed = true;
  }

  return changed
    ? { dailyDate: today, weeklyDate: weekStart, checked }
    : { ...s, dailyDate: today, weeklyDate: weekStart };
}

// ─── component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-task-checklist',
  imports: [SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="TASK CHECKLIST"
        description="Track your daily, weekly, and periodic Warframe tasks. Daily tasks reset at 00:00 UTC. Weekly tasks reset every Monday at 00:00 UTC."
        [completed]="totalCompleted()"
        [total]="totalTasks()"
      />

      <p class="hint">Remember: you don't have to do everything! Prioritize based on your current goals.</p>

      @for (section of sections; track section.id) {
        <section class="task-section" [attr.aria-labelledby]="section.id + '-heading'">
          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title" [id]="section.id + '-heading'">{{ section.title }}</h2>
              <span class="reset-badge" [class.daily]="section.resetType === 'daily'" [class.weekly]="section.resetType === 'weekly'">
                @if (section.resetType === 'daily') { Resets in {{ dailyReset() }} }
                @if (section.resetType === 'weekly') { Resets in {{ weeklyReset() }} }
                @if (section.resetType === 'other') { Manual }
              </span>
            </div>
            <div class="section-meta">
              <div class="section-progress-text">
                {{ sectionCompleted(section) }}/{{ section.tasks.length }} completed
              </div>
              <button
                type="button"
                class="reset-btn"
                (click)="resetSection(section)"
                [attr.aria-label]="'Reset ' + section.title"
              >
                Reset
              </button>
            </div>
            <div class="section-progress-bar" role="progressbar"
                 [attr.aria-valuenow]="sectionCompleted(section)"
                 [attr.aria-valuemax]="section.tasks.length"
                 [attr.aria-label]="section.title + ' progress'">
              <div class="section-progress-fill"
                   [style.width.%]="sectionPct(section)">
              </div>
            </div>
          </div>

          <ul class="task-list" role="list">
            @for (task of section.tasks; track task.id) {
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
                </label>
              </li>
            }
          </ul>
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

    .task-section {
      margin-bottom: 32px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .section-header {
      padding: 14px 16px 0;
      background: var(--color-surface2);
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 12px;
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 6px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-gold);
      margin: 0;
    }

    .reset-badge {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.08em;
      padding: 2px 8px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .reset-badge.daily { border-color: #4a7fa5; color: #7fb8d8; }
    .reset-badge.weekly { border-color: #7a5fa0; color: #b89ad8; }

    .section-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .section-progress-text {
      font-size: 11px;
      color: var(--color-text-muted);
    }

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
    .reset-btn:hover {
      border-color: var(--color-gold);
      color: var(--color-gold);
    }

    .section-progress-bar {
      height: 3px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }

    .section-progress-fill {
      height: 100%;
      background: var(--color-gold);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .task-item {
      border-bottom: 1px solid var(--color-border);
      transition: background 0.1s;
    }
    .task-item:last-child { border-bottom: none; }
    .task-item:hover { background: var(--color-surface2); }
    .task-item.task-done { opacity: 0.55; }

    .task-label {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 10px 16px;
      cursor: pointer;
      width: 100%;
    }

    .task-checkbox {
      flex-shrink: 0;
      margin-top: 1px;
      accent-color: var(--color-gold);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    .task-name {
      font-size: 13px;
      color: var(--color-text);
      font-weight: 500;
      white-space: nowrap;
    }
    .task-done .task-name {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .task-desc {
      font-size: 11px;
      color: var(--color-text-muted);
      flex: 1;
    }
  `]
})
export class TaskChecklistComponent implements OnInit {
  readonly sections = SECTIONS;

  private readonly state = signal<TaskState>({ dailyDate: '', weeklyDate: '', checked: {} });

  readonly dailyReset = signal(timeUntilDailyReset());
  readonly weeklyReset = signal(timeUntilWeeklyReset());

  readonly totalTasks = computed(() => SECTIONS.reduce((sum, s) => sum + s.tasks.length, 0));
  readonly totalCompleted = computed(() => {
    const checked = this.state().checked;
    return Object.values(checked).filter(Boolean).length;
  });

  ngOnInit(): void {
    const loaded = loadState();
    const reset = applyAutoReset(loaded);
    this.state.set(reset);
    saveState(reset);
  }

  isChecked(sectionId: string, taskId: string): boolean {
    return this.state().checked[`${sectionId}:${taskId}`] ?? false;
  }

  toggle(sectionId: string, taskId: string): void {
    const key = `${sectionId}:${taskId}`;
    this.state.update(s => {
      const checked = { ...s.checked, [key]: !s.checked[key] };
      const next = { ...s, checked };
      saveState(next);
      return next;
    });
  }

  resetSection(section: TaskSection): void {
    this.state.update(s => {
      const checked = { ...s.checked };
      section.tasks.forEach(t => delete checked[`${section.id}:${t.id}`]);
      const next = { ...s, checked };
      saveState(next);
      return next;
    });
  }

  sectionCompleted(section: TaskSection): number {
    const checked = this.state().checked;
    return section.tasks.filter(t => checked[`${section.id}:${t.id}`]).length;
  }

  sectionPct(section: TaskSection): number {
    return section.tasks.length > 0 ? (this.sectionCompleted(section) / section.tasks.length) * 100 : 0;
  }
}
