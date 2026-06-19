import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { CollapsibleSectionComponent } from '../../shared/components/collapsible-section/collapsible-section.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { createToggleSet } from '../../core/utils/toggle-set';
import { gridProgress } from '../../core/utils/grid-progress';
import { titleCase } from '../../core/utils/checklist.utils';

const LICH_COLUMNS: TrackerColumn[] = [
  { key: 'obtained', label: 'Obtained' },
  { key: '60',       label: '60%' },
  { key: 'vf',       label: 'Val. Fusion' },
];

const EPHEMERA_COLUMNS: TrackerColumn[] = [
  { key: 'obtained', label: 'Obtained' },
];

/** Maps a lich item + column key to its storage key.
 *  obtained → lich:<item>  (legacy format, no suffix)
 *  others   → lich:<item>:<col>
 */
function lichKey(item: string, col: string): string {
  return col === 'obtained' ? 'lich:' + item : 'lich:' + item + ':' + col;
}

/** Ephemera share their storage key with Collectables for 1:1 sync. */
function ephemeraKey(item: string): string {
  return 'col:' + item;
}

interface LichGroup {
  key: string;
  name: string;
  items: string[];
  isEphemera: boolean;
}

@Component({
  selector: 'app-lich-gear',
  imports: [ReactiveFormsModule, SectionHeaderComponent, CollapsibleSectionComponent, ProgressBarComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="LICH GEAR"
        description="Track Kuva, Tenet, and Coda weapons. Each weapon needs to be obtained, reach 60%+ element, and achieve Valence Fusion. Ephemera obtained here sync with Collectables."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="cl-search-wrap">
        <input class="cl-search" type="text" placeholder="Search weapons..." aria-label="Search" [formControl]="searchControl" />
      </div>

      @for (group of filteredGroups(); track group.name) {
        <app-collapsible-section
          [name]="group.name"
          [open]="openGroups.has(group.name)"
          (toggle)="openGroups.toggle(group.name)"
        >
          <app-progress-bar
            csTrailing
            [label]="''"
            [completed]="groupProgress(group).completed"
            [total]="groupProgress(group).total"
            style="flex: 0 0 200px"
          />
          @if (openGroups.has(group.name)) {
            <app-tracker-table
              [columns]="group.isEphemera ? ephemeraColumns : columns"
              [rows]="toRows(group.items)"
              [checkedFn]="group.isEphemera ? ephemeraCheckedFn : checkedFn"
              (toggle)="toggleItem($event.rowName, $event.colKey, group.isEphemera)"
            />
          }
        </app-collapsible-section>
      }

      @if (filteredGroups().length === 0 && searchQuery()) {
        <div class="cl-empty">No items match "{{ searchQuery() }}"</div>
      }
    </div>
  `,
})
export class LichGearComponent {
  private readonly trackerService = inject(TrackerService);
  private readonly rawData = inject(DataService).data;
  readonly openGroups = createToggleSet();

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly columns = LICH_COLUMNS;
  readonly ephemeraColumns = EPHEMERA_COLUMNS;

  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.trackerService.isChecked(lichKey(rowName, colKey));

  readonly ephemeraCheckedFn = (rowName: string, _colKey: string): boolean =>
    this.trackerService.isChecked(ephemeraKey(rowName));

  readonly groups = computed<LichGroup[]>(() => {
    const d = this.rawData();
    if (!d?.lichGear) return [];
    return Object.entries(d.lichGear).map(([key, items]) => ({
      key,
      name: titleCase(key),
      items,
      isEphemera: key.includes('ephemera'),
    }));
  });

  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.groups().map(g => ({
      ...g,
      items: q ? g.items.filter(i => i.toLowerCase().includes(q)) : g.items
    })).filter(g => g.items.length > 0);
  });

  readonly progress = computed(() => this.trackerService.sectionProgress('lichGear'));

  toRows(items: string[]): TrackerRow[] {
    return items.map(name => ({ name }));
  }

  toggleItem(item: string, col: string, isEphemera: boolean): void {
    this.trackerService.toggle(isEphemera ? ephemeraKey(item) : lichKey(item, col));
  }

  groupProgress(group: LichGroup): { completed: number; total: number } {
    if (group.isEphemera) {
      const completed = group.items.filter(item => this.trackerService.isChecked(ephemeraKey(item))).length;
      return { completed, total: group.items.length };
    }
    return gridProgress(
      group.items.map(name => ({ name })),
      LICH_COLUMNS,
      lichKey,
      k => this.trackerService.isChecked(k),
    );
  }
}
