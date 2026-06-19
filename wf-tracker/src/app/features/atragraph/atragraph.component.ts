import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { CollapsibleSectionComponent } from '../../shared/components/collapsible-section/collapsible-section.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { createToggleSet } from '../../core/utils/toggle-set';

const OWNED_COLUMN: TrackerColumn[] = [{ key: 'owned', label: 'Owned' }];

interface FoilGroup {
  /** Display foil name, e.g. "Atragraph Vitality". */
  name: string;
  rows: TrackerRow[];
}

@Component({
  selector: 'app-atragraph',
  imports: [SectionHeaderComponent, CollapsibleSectionComponent, TrackerTableComponent],
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
            <app-collapsible-section
              [name]="group.name"
              [progress]="groupProgress(group)"
              [open]="openGroups.has(group.name)"
              (toggle)="openGroups.toggle(group.name)"
            >
              @if (openGroups.has(group.name)) {
                <app-tracker-table
                  [columns]="ownedColumn"
                  [rows]="group.rows"
                  [checkedFn]="checkedFn"
                  (toggle)="onToggle($event)"
                />
              }
            </app-collapsible-section>
          }
        } @else {
          <div class="flat-card">
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
    .flat-card {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 4px;
    }
  `]
})
export class AtragraphComponent {
  private readonly tracker = inject(TrackerService);
  private readonly data = inject(DataService).data;

  readonly ownedColumn = OWNED_COLUMN;

  readonly openGroups = createToggleSet();
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
        this.openGroups.set(groups.map(g => g.name));
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
