import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { currentIncarnonWeek } from '../../core/services/world-state.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { CollapsibleSectionComponent } from '../../shared/components/collapsible-section/collapsible-section.component';
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
  imports: [ReactiveFormsModule, SectionHeaderComponent, CollapsibleSectionComponent, ProgressBarComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page page--narrow">
      <app-section-header
        title="INCARNON"
        description="Track Incarnon adapter acquisition and evolution across all weapon families."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="cl-search-wrap">
        <input
          class="cl-search"
          type="text"
          placeholder="Search families or weapons..."
          aria-label="Search incarnon families"
          [formControl]="searchControl"
        />
        @if (searchQuery() && searchResultCount() !== totalRowCount()) {
          <span class="cl-search-count" aria-live="polite">{{ searchResultCount() }} of {{ totalRowCount() }} results</span>
        }
      </div>

      @if (weeks().length === 0) {
        <div class="loading">Loading...</div>
      } @else {
        @for (week of weeks(); track week.label) {
          <app-collapsible-section
            [name]="week.label"
            [highlighted]="week.label === currentWeekLabel()"
            [open]="isWeekOpen(week.label)"
            (toggle)="toggleWeek(week.label)"
          >
            @if (week.label === currentWeekLabel()) {
              <span csBadge class="week-now" aria-label="current week">NOW</span>
            }
            <app-progress-bar
              csTrailing
              label=""
              [completed]="week.completed"
              [total]="week.total"
              style="flex: 0 0 200px"
            />
            @if (isWeekOpen(week.label)) {
              <app-tracker-table
                [columns]="columns"
                [rows]="week.rows"
                [checkedFn]="checkedFn"
                (toggle)="toggleItem($event.rowName, $event.colKey)"
              />
            }
          </app-collapsible-section>
        }
      }
    </div>
  `,
  styles: [`
    .week-now {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      background: var(--color-accent);
      color: #000;
      vertical-align: middle;
    }
  `]
})
export class IncarnonComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = this.dataService.data;

  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  /** Number of numbered rotation weeks in the data (excludes Duviri) = cycle length. */
  private readonly weekCount = computed(() => {
    const d = this.data();
    if (!d) return 0;
    const weeks = new Set<number>();
    for (const e of d.incarnon) if (e.week != null) weeks.add(e.week);
    return weeks.size;
  });

  readonly currentWeekLabel = computed(() =>
    this.weekCount() > 0 ? `Week ${currentIncarnonWeek(this.weekCount())}` : ''
  );

  private readonly openWeeks = createToggleSet();

  readonly columns = INCARNON_COLUMNS;

  constructor() {
    // Open the current week by default, once the data (and thus its label) loads.
    // Guarded so a later data refresh never clobbers the user's expand/collapse state.
    let seeded = false;
    effect(() => {
      const label = this.currentWeekLabel();
      if (!seeded && label) {
        this.openWeeks.set([label]);
        seeded = true;
      }
    });
  }

  readonly checkedFn = (rowName: string, colKey: string) =>
    this.tracker.isChecked(familyKey(rowName, colKey));

  readonly allWeeks = computed<IncWeek[]>(() => {
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

  readonly searchResultCount = computed(() => this.weeks().reduce((sum, w) => sum + w.rows.length, 0));
  readonly totalRowCount = computed(() => this.allWeeks().reduce((sum, w) => sum + w.rows.length, 0));

  readonly progress = computed(() => this.tracker.sectionProgress('incarnon'));

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
