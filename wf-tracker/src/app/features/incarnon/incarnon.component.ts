import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { currentIncarnonWeek } from '../../core/services/world-state.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { createToggleSet } from '../../core/utils/toggle-set';

const INCARNON_COLUMNS: TrackerColumn[] = [
  { key: 'earned', label: 'Adapter Earned' },
  { key: 'installed', label: 'Adapter Installed' },
  { key: 'maxed', label: 'Evo Maxed' },
];

interface IncWeek {
  label: string;
  rows: TrackerRow[];
  completed: number;
  total: number;
}

function familyKey(familyName: string, stage: string): string {
  return `incarnon:family:${familyName}:${stage}`;
}

@Component({
  selector: 'app-incarnon',
  imports: [ReactiveFormsModule, SectionHeaderComponent, ProgressBarComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="INCARNON"
        description="Track Incarnon adapter acquisition and evolution across all weapon families."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="controls">
        <input
          class="search"
          type="text"
          placeholder="Search families or weapons..."
          aria-label="Search incarnon families"
          [formControl]="searchControl"
        />
      </div>

      @if (weeks().length === 0) {
        <div class="empty">Loading...</div>
      } @else {
        <div class="weeks">
          @for (week of weeks(); track week.label) {
            <section class="week-section" [class.week-current]="week.label === currentWeekLabel" [attr.aria-label]="week.label">
              <button
                type="button"
                class="week-header"
                (click)="toggleWeek(week.label)"
                [attr.aria-expanded]="isWeekOpen(week.label)"
              >
                <span class="week-arrow" aria-hidden="true">{{ isWeekOpen(week.label) ? '▾' : '▸' }}</span>
                <span class="week-label">
                  {{ week.label }}
                  @if (week.label === currentWeekLabel) {
                    <span class="week-now" aria-label="current week">NOW</span>
                  }
                </span>
                <app-progress-bar
                  label=""
                  [completed]="week.completed"
                  [total]="week.total"
                  style="flex: 0 0 200px"
                />
              </button>

              @if (isWeekOpen(week.label)) {
                <div class="week-body">
                  <app-tracker-table
                    [columns]="columns"
                    [rows]="week.rows"
                    [checkedFn]="checkedFn"
                    (toggle)="toggleItem($event.rowName, $event.colKey)"
                  />
                </div>
              }
            </section>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }

    .controls { margin-bottom: 16px; }
    .search {
      width: 100%;
      max-width: 400px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }
    .search:focus { border-color: var(--color-gold); }

    .weeks { display: flex; flex-direction: column; gap: 8px; }

    .week-section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .week-current {
      border-color: var(--color-gold);
    }
    .week-current .week-header {
      background: rgba(200, 155, 60, 0.08);
    }
    .week-now {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: var(--color-gold);
      color: #000;
      vertical-align: middle;
    }

    .week-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--color-surface2);
      cursor: pointer;
      width: 100%;
      text-align: left;
      border: none;
      font: inherit;
      color: inherit;
    }
    .week-header:hover { background: #1e1e2c; }
    .week-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .week-label {
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text);
    }

    .week-body { padding: 0; }

    .empty { padding: 40px; text-align: center; color: var(--color-text-muted); font-size: 13px; }
  `]
})
export class IncarnonComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly currentWeekLabel = `Week ${currentIncarnonWeek()}`;
  private readonly openWeeks = createToggleSet([`Week ${currentIncarnonWeek()}`]);

  readonly columns = INCARNON_COLUMNS;

  readonly checkedFn = (rowName: string, colKey: string) =>
    this.tracker.isChecked(familyKey(rowName, colKey));

  private readonly allWeeks = computed<IncWeek[]>(() => {
    const d = this.data();
    if (!d) return [];
    const completionist = this.tracker.settings().incarnon.completionist;

    const byWeek = new Map<string, TrackerRow[]>();

    for (const entry of d.incarnon) {
      const label = entry.week != null ? `Week ${entry.week}` : 'Duviri';
      if (!byWeek.has(label)) byWeek.set(label, []);

      if (completionist || entry.name === '1 FAMILY') {
        // Each weapon is its own row
        for (const w of entry.weapons) {
          byWeek.get(label)!.push({ name: w });
        }
      } else {
        byWeek.get(label)!.push({
          name: entry.name,
          subtitle: entry.weapons.length > 1 ? entry.weapons.join(' · ') : undefined,
        });
      }
    }

    return Array.from(byWeek.entries()).map(([label, rows]) => {
      let total = 0, completed = 0;
      for (const row of rows) {
        total += 3;
        if (this.checkedFn(row.name, 'earned')) completed++;
        if (this.checkedFn(row.name, 'installed')) completed++;
        if (this.checkedFn(row.name, 'maxed')) completed++;
      }
      return { label, rows, total, completed };
    });
  });

  readonly weeks = computed<IncWeek[]>(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.allWeeks();

    return this.allWeeks()
      .map(week => ({
        ...week,
        rows: week.rows.filter(r =>
          r.name.toLowerCase().includes(q) ||
          (r.subtitle?.toLowerCase().includes(q) ?? false)
        )
      }))
      .filter(w => w.rows.length > 0);
  });

  readonly progress = computed(() => {
    let total = 0, completed = 0;
    for (const w of this.allWeeks()) {
      total += w.total;
      completed += w.completed;
    }
    return { completed, total };
  });

  isWeekOpen(label: string): boolean {
    return this.openWeeks.has(label);
  }

  toggleWeek(label: string): void {
    this.openWeeks.toggle(label);
  }

  toggleItem(familyName: string, colKey: string): void {
    this.tracker.toggle(familyKey(familyName, colKey));
  }
}
