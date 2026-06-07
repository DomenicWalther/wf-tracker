import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';

const CATEGORY_ORDER = [
  'Warframe', 'Aura', 'Primary', 'Secondary', 'Melee', 'Stance',
  'Companion', 'Archwing', 'Necramech', 'K-Drive', 'Railjack',
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
  imports: [SectionHeaderComponent, TrackerTableComponent, ReactiveFormsModule],
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
        <div class="mod-search">
          <input
            class="mod-search-input"
            type="text"
            placeholder="Search mods..."
            aria-label="Search mods"
            [formControl]="searchControl"
          />
        </div>

        @for (group of filteredGroups(); track group.name) {
          <div class="mod-section">
            <button
              type="button"
              class="mod-section-header"
              (click)="toggleGroup(group.name)"
              [attr.aria-expanded]="isGroupOpen(group.name)"
            >
              <span class="mod-arrow" aria-hidden="true">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
              <span class="mod-section-name">{{ group.name }}</span>
              <span class="mod-progress">{{ groupProgress(group) }}</span>
            </button>
            @if (isGroupOpen(group.name)) {
              <app-tracker-table
                [columns]="group.columns"
                [rows]="group.rows"
                [checkedFn]="checkedFn"
                [disabledCellFn]="group.disabledCellFn"
                (toggle)="onToggle($event)"
              />
            }
          </div>
        }

        @if (filteredGroups().length === 0) {
          <div class="mod-empty">No mods match "{{ searchQuery() }}"</div>
        }
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }
    .mod-search { margin-bottom: 16px; }
    .mod-search-input {
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
    .mod-search-input:focus { border-color: var(--color-gold); }
    .mod-section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .mod-section-header {
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
    .mod-section-header:hover { background: var(--color-surface3); }
    .mod-section-header:focus-visible { outline: 2px solid var(--color-gold); outline-offset: -2px; }
    .mod-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .mod-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .mod-progress { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .mod-empty { text-align: center; padding: 48px; color: var(--color-text-muted); font-size: 13px; }
  `]
})
export class ModsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly openGroups = signal<Set<string>>(new Set());
  private groupsInitialized = false;

  readonly modGroups = computed<ModGroup[]>(() => {
    const mods = this.data()?.mods;
    if (!mods) return [];
    const hoarder = this.tracker.settings().mod.hoarder;

    // Group mods by category preserving CATEGORY_ORDER
    const byCategory = new Map<string, typeof mods>();
    for (const cat of CATEGORY_ORDER) byCategory.set(cat, []);
    for (const mod of mods) {
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

  constructor() {
    // Open first group on first load only
    effect(() => {
      const groups = this.modGroups();
      if (groups.length > 0 && !this.groupsInitialized) {
        this.groupsInitialized = true;
        this.openGroups.set(new Set([groups[0].name]));
      }
    });
    // Open all matching groups while searching
    effect(() => {
      const q = this.searchQuery();
      if (q) {
        this.openGroups.set(new Set(this.filteredGroups().map(g => g.name)));
      }
    });
  }

  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.tracker.isChecked(`mod:${rowName}:${colKey}`);

  readonly progress = computed(() => {
    const groups = this.modGroups();
    let completed = 0, total = 0;
    for (const group of groups) {
      for (const row of group.rows) {
        for (const col of group.columns) {
          if (group.disabledCellFn?.(row.name, col.key)) continue;
          total++;
          if (this.tracker.isChecked(`mod:${row.name}:${col.key}`)) completed++;
        }
      }
    }
    return { completed, total };
  });

  groupProgress(group: ModGroup): string {
    let done = 0, total = 0;
    for (const row of group.rows) {
      for (const col of group.columns) {
        if (group.disabledCellFn?.(row.name, col.key)) continue;
        total++;
        if (this.tracker.isChecked(`mod:${row.name}:${col.key}`)) done++;
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
    this.tracker.toggle(`mod:${event.rowName}:${event.colKey}`);
  }
}
