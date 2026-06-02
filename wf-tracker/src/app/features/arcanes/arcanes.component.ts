import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { titleCase } from '../../core/utils/checklist.utils';

/** Groups whose arcanes max at rank 3 (need 4 copies), not rank 5. */
export const LIMITED_ARCANE_GROUPS = new Set(['operator', 'amp', 'kitgun', 'zaw']);

const STANDARD_COLUMNS: TrackerColumn[] = [
  { key: 'owned', label: 'Owned' },
  { key: 'maxed', label: 'Maxed' },
];

const STANDARD_PSYCHO_COLUMNS: TrackerColumn[] = [
  { key: 'owned', label: 'Owned' },
  { key: 'r1', label: 'Rank 1' },
  { key: 'r2', label: 'Rank 2' },
  { key: 'r3', label: 'Rank 3' },
  { key: 'r4', label: 'Rank 4' },
  { key: 'maxed', label: 'Maxed' },
];

const LIMITED_PSYCHO_COLUMNS: TrackerColumn[] = [
  { key: 'owned', label: 'Owned' },
  { key: 'r1', label: 'Rank 1' },
  { key: 'r2', label: 'Rank 2' },
  { key: 'maxed', label: 'Maxed' },
];

export function arcaneKey(name: string, colKey: string): string {
  if (colKey === 'owned') return `arcane:${name}`;
  if (colKey === 'maxed') return `arcane:${name}:maxed`;
  return `arcane:${name}:${colKey}`; // r1, r2, r3, r4
}

interface ArcaneGroup {
  name: string;
  columns: TrackerColumn[];
  rows: TrackerRow[];
}

@Component({
  selector: 'app-arcanes',
  imports: [SectionHeaderComponent, TrackerTableComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="ARCANES"
        description="Track arcane collection. Standard: obtained & max rank. Arcane Psycho: all ranks collected."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      @if (arcaneGroups().length > 0) {
        <div class="arc-search">
          <input
            class="cl-search"
            type="text"
            placeholder="Search arcanes..."
            aria-label="Search"
            [formControl]="searchControl"
          />
        </div>

        @for (group of filteredGroups(); track group.name) {
          <div class="arc-section">
            <button
              type="button"
              class="arc-section-header"
              (click)="toggleGroup(group.name)"
              [attr.aria-expanded]="isGroupOpen(group.name)"
            >
              <span class="arc-arrow" aria-hidden="true">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
              <span class="arc-section-name">{{ group.name }}</span>
              <span class="arc-progress">{{ groupProgress(group) }}</span>
            </button>
            @if (isGroupOpen(group.name)) {
              <app-tracker-table
                [columns]="group.columns"
                [rows]="group.rows"
                [checkedFn]="checkedFn"
                (toggle)="onTableToggle($event.rowName, $event.colKey)"
              />
            }
          </div>
        }

        @if (filteredGroups().length === 0) {
          <div class="arc-empty">No arcanes match "{{ searchQuery() }}"</div>
        }
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .arc-search { margin-bottom: 16px; }
    .cl-search {
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
    .cl-search:focus { border-color: var(--color-gold); }
    .arc-section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .arc-section-header {
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
    .arc-section-header:hover { background: var(--color-surface3); }
    .arc-section-header:focus-visible { outline: 2px solid var(--color-gold); outline-offset: -2px; }
    .arc-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .arc-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .arc-progress { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .arc-empty { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 13px; }
  `]
})
export class ArcanesComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly openGroups = signal<Set<string>>(new Set());

  readonly arcaneGroups = computed<ArcaneGroup[]>(() => {
    const raw = this.data()?.arcanes;
    if (!raw) return [];
    const psycho = this.tracker.settings().arcane.psycho;
    return Object.entries(raw).map(([group, items]) => {
      const limited = LIMITED_ARCANE_GROUPS.has(group);
      const columns = psycho
        ? (limited ? LIMITED_PSYCHO_COLUMNS : STANDARD_PSYCHO_COLUMNS)
        : STANDARD_COLUMNS;
      return {
        name: titleCase(group),
        columns,
        rows: items.map((name): TrackerRow => ({ name })),
      };
    });
  });

  readonly filteredGroups = computed<ArcaneGroup[]>(() => {
    const q = this.searchQuery().toLowerCase();
    const groups = this.arcaneGroups();
    return q
      ? groups.map(g => ({ ...g, rows: g.rows.filter(r => r.name.toLowerCase().includes(q)) })).filter(g => g.rows.length > 0)
      : groups;
  });

  constructor() {
    effect(() => {
      const groups = this.arcaneGroups();
      if (groups.length > 0 && this.openGroups().size === 0) {
        this.openGroups.set(new Set([groups[0].name]));
      }
    });
    effect(() => {
      const q = this.searchQuery();
      if (q) {
        this.openGroups.set(new Set(this.filteredGroups().map(g => g.name)));
      }
    });
  }

  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.tracker.isChecked(arcaneKey(rowName, colKey));

  readonly progress = computed(() => {
    const groups = this.arcaneGroups();
    const allKeys = groups.flatMap(g =>
      g.rows.flatMap(r => g.columns.map(c => arcaneKey(r.name, c.key)))
    );
    return {
      completed: allKeys.filter(k => this.tracker.isChecked(k)).length,
      total: allKeys.length,
    };
  });

  groupProgress(group: ArcaneGroup): string {
    const total = group.rows.length * group.columns.length;
    const done = group.rows
      .flatMap(r => group.columns.map(c => arcaneKey(r.name, c.key)))
      .filter(k => this.tracker.isChecked(k)).length;
    return `${done}/${total}`;
  }

  isGroupOpen(name: string): boolean {
    return this.openGroups().has(name);
  }

  toggleGroup(name: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  onTableToggle(rowName: string, colKey: string): void {
    this.tracker.toggle(arcaneKey(rowName, colKey));
  }
}
