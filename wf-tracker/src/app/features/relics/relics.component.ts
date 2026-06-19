import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { CollapsibleSectionComponent } from '../../shared/components/collapsible-section/collapsible-section.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { createToggleSet } from '../../core/utils/toggle-set';
import { gridProgress } from '../../core/utils/grid-progress';

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

/** Storage key for one relic cell. */
function relicKey(name: string, colKey: string): string {
  return colKey === 'owned' ? `relic:${name}` : `relic:${name}:${colKey}`;
}

@Component({
  selector: 'app-relics',
  imports: [SectionHeaderComponent, CollapsibleSectionComponent, TrackerTableComponent],
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
                (toggle)="onToggle($event)"
              />
            }
          </app-collapsible-section>
        }
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
})
export class RelicsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly data = inject(DataService).data;

  readonly openGroups = createToggleSet();
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

  readonly progress = computed(() => this.tracker.sectionProgress('relics'));

  constructor() {
    effect(() => {
      const groups = this.groups();
      if (groups.length > 0 && !this.groupsInitialized) {
        this.groupsInitialized = true;
        this.openGroups.toggle(groups[0].name);
      }
    });
  }

  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.tracker.isChecked(relicKey(rowName, colKey));

  groupProgress(group: RelicGroup): string {
    const p = gridProgress(group.rows, group.columns, relicKey, k => this.tracker.isChecked(k));
    return `${p.completed}/${p.total}`;
  }

  onToggle(event: { rowName: string; colKey: string }): void {
    this.tracker.toggle(relicKey(event.rowName, event.colKey));
  }
}
