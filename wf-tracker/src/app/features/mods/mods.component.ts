import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { CollapsibleSectionComponent } from '../../shared/components/collapsible-section/collapsible-section.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { createToggleSet } from '../../core/utils/toggle-set';
import { gridProgress } from '../../core/utils/grid-progress';

const CATEGORY_ORDER = [
  'Warframe', 'Warframe Augment', 'Aura',
  'Primary', 'Primary Augment',
  'Secondary', 'Secondary Augment',
  'Melee', 'Melee Augment', 'Stance',
  'Companion',
  'Archwing', 'Archwing Augment',
  'Necramech', 'K-Drive', 'Railjack',
  'Conclave', 'Conclave Augment',
];

interface ModGroup {
  name: string;
  columns: TrackerColumn[];
  rows: TrackerRow[];
  disabledCellFn: ((rowName: string, colKey: string) => boolean) | null;
  maxRankMap: Map<string, number>;
}

@Component({
  selector: 'app-mods',
  imports: [SectionHeaderComponent, CollapsibleSectionComponent, TrackerTableComponent, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="MOD COLLECTION"
        description="Track your mod collection. Standard: owned & maxed. Mod Hoarder: one copy at every rank."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      @if (modGroups().length > 0) {
        <div class="cl-search-wrap">
          <input
            class="cl-search"
            type="text"
            placeholder="Search mods..."
            aria-label="Search mods"
            [formControl]="searchControl"
          />
          @if (searchQuery() && searchResultCount() !== totalModCount()) {
            <span class="cl-search-count" aria-live="polite">{{ searchResultCount() }} of {{ totalModCount() }} results</span>
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
                [checkedFn]="checkedFn"
                [disabledCellFn]="group.disabledCellFn"
                (toggle)="onToggle($event)"
              />
            }
          </app-collapsible-section>
        }

        @if (filteredGroups().length === 0) {
          <div class="cl-empty">No mods match "{{ searchQuery() }}"</div>
        }
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
})
export class ModsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly data = inject(DataService).data;

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  readonly openGroups = createToggleSet();
  private groupsInitialized = false;

  readonly modGroups = computed<ModGroup[]>(() => {
    const mods = this.data()?.mods;
    if (!mods) return [];
    const hoarder = this.tracker.settings().mod.hoarder;
    const includeConclave = this.tracker.settings().includeConclave;

    // Group mods by category preserving CATEGORY_ORDER
    const byCategory = new Map<string, typeof mods>();
    for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
    for (const mod of mods) {
      if ((mod.category === 'Conclave' || mod.category === 'Conclave Augment') && !includeConclave) continue;
      const cat = mod.category ?? 'Warframe';
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(mod);
    }

    const groups: ModGroup[] = [];
    for (const [cat, catMods] of byCategory) {
      if (catMods.length === 0) continue;

      const maxRankMap = new Map(catMods.map(m => [m.name, m.maxRank]));
      let columns: TrackerColumn[];
      let disabledCellFn: ((rowName: string, colKey: string) => boolean) | null = null;

      if (hoarder) {
        const globalMax = catMods.reduce((m, mod) => Math.max(m, mod.maxRank), 0);
        columns = Array.from({ length: globalMax + 1 }, (_, i) => ({ key: `r${i}`, label: `R${i}` }));
        disabledCellFn = (rowName, colKey) => {
          const rank = parseInt(colKey.slice(1), 10);
          return rank > (maxRankMap.get(rowName) ?? 0);
        };
      } else {
        columns = [
          { key: 'owned', label: 'Owned' },
          { key: 'maxed', label: 'Maxed' },
        ];
      }

      groups.push({
        name: cat,
        columns,
        rows: catMods.map((m): TrackerRow => ({ name: m.name })),
        disabledCellFn,
        maxRankMap,
      });
    }
    return groups;
  });

  readonly filteredGroups = computed<ModGroup[]>(() => {
    const q = this.searchQuery().toLowerCase();
    const groups = this.modGroups();
    return q
      ? groups
          .map(g => ({ ...g, rows: g.rows.filter(r => r.name.toLowerCase().includes(q)) }))
          .filter(g => g.rows.length > 0)
      : groups;
  });

  readonly totalModCount = computed(() => this.modGroups().reduce((sum, g) => sum + g.rows.length, 0));
  readonly searchResultCount = computed(() => this.filteredGroups().reduce((sum, g) => sum + g.rows.length, 0));

  constructor() {
    // Open first group on first load only
    effect(() => {
      const groups = this.modGroups();
      if (groups.length > 0 && !this.groupsInitialized) {
        this.groupsInitialized = true;
        this.openGroups.toggle(groups[0].name);
      }
    });
    // Open all matching groups while searching
    effect(() => {
      const q = this.searchQuery();
      if (q) {
        this.openGroups.set(this.filteredGroups().map(g => g.name));
      }
    });
  }

  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.tracker.isChecked(`mod:${rowName}:${colKey}`);

  readonly progress = computed(() => this.tracker.sectionProgress('mods'));

  groupProgress(group: ModGroup): string {
    const p = gridProgress(
      group.rows,
      group.columns,
      (rowName, colKey) => `mod:${rowName}:${colKey}`,
      k => this.tracker.isChecked(k),
      group.disabledCellFn ?? undefined,
    );
    return `${p.completed}/${p.total}`;
  }

  onToggle(event: { rowName: string; colKey: string }): void {
    this.tracker.toggle(`mod:${event.rowName}:${event.colKey}`);
  }
}
