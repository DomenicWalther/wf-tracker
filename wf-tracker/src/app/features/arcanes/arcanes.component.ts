import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { CollapsibleSectionComponent } from '../../shared/components/collapsible-section/collapsible-section.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { titleCase } from '../../core/utils/checklist.utils';
import { arcaneKey } from '../../core/utils/section-progress';
import { gridProgress } from '../../core/utils/grid-progress';
import { createToggleSet } from '../../core/utils/toggle-set';

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

interface ArcaneGroup {
  name: string;
  groupKey: string;
  columns: TrackerColumn[];
  rows: TrackerRow[];
  checkedFn: (rowName: string, colKey: string) => boolean;
}

@Component({
  selector: 'app-arcanes',
  imports: [SectionHeaderComponent, CollapsibleSectionComponent, TrackerTableComponent, ReactiveFormsModule],
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
        <div class="cl-search-wrap">
          <input
            class="cl-search"
            type="text"
            placeholder="Search arcanes..."
            aria-label="Search"
            [formControl]="searchControl"
          />
          @if (searchQuery() && searchResultCount() !== totalArcaneCount()) {
            <span class="cl-search-count" aria-live="polite">{{ searchResultCount() }} of {{ totalArcaneCount() }} results</span>
          }
        </div>

        @for (group of filteredGroups(); track group.name) {
          <app-collapsible-section
            [name]="group.name"
            [progress]="groupProgress(group)"
            [open]="openGroups.has(group.name)"
            (toggle)="openGroups.toggle(group.name)"
          >
            @if (openGroups.has(group.name)) {
              <app-tracker-table
                [columns]="group.columns"
                [rows]="group.rows"
                [checkedFn]="group.checkedFn"
                (toggle)="onTableToggle(group.groupKey, $event.rowName, $event.colKey)"
              />
            }
          </app-collapsible-section>
        }

        @if (filteredGroups().length === 0) {
          <div class="cl-empty">No arcanes match "{{ searchQuery() }}"</div>
        }
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
})
export class ArcanesComponent {
  private readonly tracker = inject(TrackerService);
  private readonly data = inject(DataService).data;

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  readonly openGroups = createToggleSet();
  private groupsInitialized = false;

  readonly arcaneGroups = computed<ArcaneGroup[]>(() => {
    const raw = this.data()?.arcanes;
    if (!raw) return [];
    const psycho = this.tracker.settings().arcane.psycho;
    return Object.entries(raw).map(([groupKey, items]) => {
      const limited = LIMITED_ARCANE_GROUPS.has(groupKey);
      const columns = psycho
        ? (limited ? LIMITED_PSYCHO_COLUMNS : STANDARD_PSYCHO_COLUMNS)
        : STANDARD_COLUMNS;
      return {
        name: titleCase(groupKey),
        groupKey,
        columns,
        rows: items.map((name): TrackerRow => ({ name })),
        checkedFn: (rowName: string, colKey: string) =>
          this.tracker.isChecked(arcaneKey(groupKey, rowName, colKey)),
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

  readonly totalArcaneCount = computed(() => this.arcaneGroups().reduce((sum, g) => sum + g.rows.length, 0));
  readonly searchResultCount = computed(() => this.filteredGroups().reduce((sum, g) => sum + g.rows.length, 0));

  constructor() {
    effect(() => {
      const groups = this.arcaneGroups();
      if (groups.length > 0 && !this.groupsInitialized) {
        this.groupsInitialized = true;
        this.openGroups.toggle(groups[0].name);
      }
    });
    effect(() => {
      const q = this.searchQuery();
      if (q) {
        this.openGroups.set(this.filteredGroups().map(g => g.name));
      }
    });
  }

  readonly progress = computed(() => this.tracker.sectionProgress('arcanes'));

  groupProgress(group: ArcaneGroup): string {
    const p = gridProgress(
      group.rows,
      group.columns,
      (rowName, colKey) => arcaneKey(group.groupKey, rowName, colKey),
      k => this.tracker.isChecked(k),
    );
    return `${p.completed}/${p.total}`;
  }

  onTableToggle(groupKey: string, rowName: string, colKey: string): void {
    this.tracker.toggle(arcaneKey(groupKey, rowName, colKey));
  }
}
