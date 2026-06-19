import { Component, inject, computed, signal, effect, ChangeDetectionStrategy } from '@angular/core';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';

const OWNED_COLUMN: TrackerColumn[] = [{ key: 'owned', label: 'Owned' }];

interface FoilGroup {
  /** Display foil name, e.g. "Atragraph Vitality". */
  name: string;
  rows: TrackerRow[];
}

@Component({
  selector: 'app-atragraph',
  imports: [SectionHeaderComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="ATRAGRAPH"
        description="Track Atragraph foil mods. Standard: one foil per family. Collector: every variant the foil applies to."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      @if (groups().length > 0) {
        @if (collectAll()) {
          @for (group of groups(); track group.name) {
            <div class="atra-section">
              <button
                type="button"
                class="atra-section-header"
                (click)="toggleGroup(group.name)"
                [attr.aria-expanded]="isGroupOpen(group.name)"
              >
                <span class="atra-arrow" aria-hidden="true">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
                <span class="atra-section-name">{{ group.name }}</span>
                <span class="atra-progress">{{ groupProgress(group) }}</span>
              </button>
              @if (isGroupOpen(group.name)) {
                <app-tracker-table
                  [columns]="ownedColumn"
                  [rows]="group.rows"
                  [checkedFn]="checkedFn"
                  (toggle)="onToggle($event)"
                />
              }
            </div>
          }
        } @else {
          <div class="atra-section atra-section--flat">
            <app-tracker-table
              [columns]="ownedColumn"
              [rows]="foilRows()"
              [checkedFn]="checkedFn"
              (toggle)="onToggle($event)"
            />
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
    .atra-section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .atra-section--flat { padding: 4px; }
    .atra-section-header {
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
    .atra-section-header:hover { background: var(--color-surface3); }
    .atra-section-header:focus-visible { outline: 2px solid var(--color-gold); outline-offset: -2px; }
    .atra-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .atra-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .atra-progress { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  `]
})
export class AtragraphComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = this.dataService.data;

  readonly ownedColumn = OWNED_COLUMN;

  private readonly openGroups = signal<Set<string>>(new Set());
  private groupsInitialized = false;

  readonly collectAll = computed(() => this.tracker.settings().atragraph.collectAll);

  readonly groups = computed<FoilGroup[]>(() => {
    const entries = this.data()?.atragraph;
    if (!entries) return [];
    return entries.map((e): FoilGroup => ({
      name: `Atragraph ${e.name}`,
      rows: e.variants.map((v): TrackerRow => ({ name: v })),
    }));
  });

  /** One row per foil family for standard (non-collector) mode. */
  readonly foilRows = computed<TrackerRow[]>(() =>
    this.groups().map((g): TrackerRow => ({ name: g.name })));

  readonly progress = computed(() => this.tracker.sectionProgress('atragraph'));

  constructor() {
    // Open all groups on first load (collector mode), like the other tracker sections.
    effect(() => {
      const groups = this.groups();
      if (groups.length > 0 && !this.groupsInitialized) {
        this.groupsInitialized = true;
        this.openGroups.set(new Set(groups.map(g => g.name)));
      }
    });
  }

  /** In collector mode the table renders variant rows grouped by foil; in standard mode it renders foil rows. */
  readonly checkedFn = (rowName: string, _colKey: string): boolean =>
    this.collectAll()
      ? this.tracker.isChecked(this.variantKeyFromRow(rowName))
      : this.tracker.isChecked(this.foilKey(rowName));

  groupProgress(group: FoilGroup): string {
    let done = 0;
    for (const row of group.rows) {
      if (this.tracker.isChecked(this.variantKey(group.name, row.name))) done++;
    }
    return `${done}/${group.rows.length}`;
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
    const key = this.collectAll()
      ? this.variantKeyFromRow(event.rowName)
      : this.foilKey(event.rowName);
    this.tracker.toggle(key);
  }

  private foilKey(foilName: string): string {
    return `atragraph:${foilName}`;
  }

  private variantKey(foilName: string, variant: string): string {
    return `atragraph:${foilName}:${variant}`;
  }

  /** Variant names are globally unique across foil families, so resolve the owning foil from the row name. */
  private variantKeyFromRow(variant: string): string {
    const group = this.groups().find(g => g.rows.some(r => r.name === variant));
    return this.variantKey(group?.name ?? '', variant);
  }
}
