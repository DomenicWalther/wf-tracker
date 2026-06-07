import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';

const BASE_COLUMNS: TrackerColumn[] = [
  { key: 'owned',   label: 'Owned'   },
  { key: 'radiant', label: 'Radiant' },
];

const HOARDER_COLUMNS: TrackerColumn[] = [
  { key: 'owned',       label: 'Owned'       },
  { key: 'exceptional', label: 'Exceptional' },
  { key: 'flawless',    label: 'Flawless'    },
  { key: 'radiant',     label: 'Radiant'     },
];

interface RelicGroup {
  name: string;
  columns: TrackerColumn[];
  rows: TrackerRow[];
}

@Component({
  selector: 'app-relics',
  imports: [SectionHeaderComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="RELICS"
        description="Track relic ownership and refinement. Standard: owned & radiant. Hoarder: all refinement steps."
        [completed]="progress().completed"
        [total]="progress().total"
      />
      @if (groups().length > 0) {
        @for (group of groups(); track group.name) {
          <div class="relic-section">
            <button
              type="button"
              class="relic-section-header"
              (click)="toggleGroup(group.name)"
              [attr.aria-expanded]="isGroupOpen(group.name)"
            >
              <span class="relic-arrow" aria-hidden="true">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
              <span class="relic-section-name">{{ group.name }}</span>
              <span class="relic-progress">{{ groupProgress(group) }}</span>
            </button>
            @if (isGroupOpen(group.name)) {
              <app-tracker-table
                [columns]="group.columns"
                [rows]="group.rows"
                [checkedFn]="checkedFn"
                (toggle)="onToggle($event)"
              />
            }
          </div>
        }
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .relic-section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .relic-section-header {
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
      border-radius: 6px;
    }
    .relic-section-header:hover { background: var(--color-surface3); }
    .relic-section-header:focus-visible { outline: 2px solid var(--color-gold); outline-offset: -2px; }
    .relic-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .relic-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .relic-progress { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  `]
})
export class RelicsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  private readonly openGroups = signal<Set<string>>(new Set());
  private groupsInitialized = false;

  readonly groups = computed<RelicGroup[]>(() => {
    const raw = this.data()?.relics;
    if (!raw) return [];
    const columns = this.tracker.settings().relic.hoarder ? HOARDER_COLUMNS : BASE_COLUMNS;
    return Object.entries(raw).map(([tier, items]) => ({
      name: tier,
      columns,
      rows: (items as string[]).map((name): TrackerRow => ({ name })),
    }));
  });

  readonly progress = computed(() => {
    let completed = 0, total = 0;
    for (const group of this.groups()) {
      for (const row of group.rows) {
        for (const col of group.columns) {
          total++;
          if (this.checkedFn(row.name, col.key)) completed++;
        }
      }
    }
    return { completed, total };
  });

  constructor() {
    effect(() => {
      const groups = this.groups();
      if (groups.length > 0 && !this.groupsInitialized) {
        this.groupsInitialized = true;
        this.openGroups.set(new Set([groups[0].name]));
      }
    });
  }

  readonly checkedFn = (rowName: string, colKey: string): boolean => {
    const key = colKey === 'owned' ? `relic:${rowName}` : `relic:${rowName}:${colKey}`;
    return this.tracker.isChecked(key);
  };

  groupProgress(group: RelicGroup): string {
    let done = 0, total = 0;
    for (const row of group.rows) {
      for (const col of group.columns) {
        total++;
        if (this.checkedFn(row.name, col.key)) done++;
      }
    }
    return `${done}/${total}`;
  }

  isGroupOpen(name: string): boolean { return this.openGroups().has(name); }

  toggleGroup(name: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  onToggle(event: { rowName: string; colKey: string }): void {
    const key = event.colKey === 'owned'
      ? `relic:${event.rowName}`
      : `relic:${event.rowName}:${event.colKey}`;
    this.tracker.toggle(key);
  }
}
