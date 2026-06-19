import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { createToggleSet } from '../../core/utils/toggle-set';

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

@Component({
  selector: 'app-lich-gear',
  imports: [ReactiveFormsModule, SectionHeaderComponent, ProgressBarComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="LICH GEAR"
        description="Track Kuva, Tenet, and Coda weapons. Each weapon needs to be obtained, reach 60%+ element, and achieve Valence Fusion. Ephemera obtained here sync with Collectables."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="gear-search">
        <input class="cl-search" type="text" placeholder="Search weapons..." aria-label="Search" [formControl]="searchControl" />
      </div>

      @for (group of filteredGroups(); track group.name) {
        <div class="gear-section">
          <button
            type="button"
            class="gear-section-header"
            (click)="toggleGroup(group.name)"
            [attr.aria-expanded]="isGroupOpen(group.name)"
          >
            <span class="gear-arrow" aria-hidden="true">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
            <span class="gear-section-name">{{ group.name }}</span>
            <app-progress-bar
              [label]="''"
              [completed]="groupProgress(group).completed"
              [total]="groupProgress(group).total"
              style="flex: 0 0 200px"
            />
          </button>
          @if (isGroupOpen(group.name)) {
            <app-tracker-table
              [columns]="group.isEphemera ? ephemeraColumns : columns"
              [rows]="toRows(group.items)"
              [checkedFn]="group.isEphemera ? ephemeraCheckedFn : checkedFn"
              (toggle)="toggleItem($event.rowName, $event.colKey, group.isEphemera)"
            />
          }
        </div>
      }

      @if (filteredGroups().length === 0 && searchQuery()) {
        <div class="empty">No items match "{{ searchQuery() }}"</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .gear-search { margin-bottom: 16px; }
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
    .gear-section {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .gear-section-header {
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
    .gear-section-header:hover { background: var(--color-surface3); }
    .gear-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .gear-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .empty {
      text-align: center;
      padding: 40px;
      color: var(--color-text-muted);
      font-size: 13px;
    }
  `]
})
export class LichGearComponent {
  private readonly trackerService = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly rawData = this.dataService.data;
  private readonly openGroups = createToggleSet();

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly columns = LICH_COLUMNS;
  readonly ephemeraColumns = EPHEMERA_COLUMNS;

  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.trackerService.isChecked(lichKey(rowName, colKey));

  readonly ephemeraCheckedFn = (rowName: string, _colKey: string): boolean =>
    this.trackerService.isChecked(ephemeraKey(rowName));

  readonly groups = computed<{ key: string; name: string; items: string[]; isEphemera: boolean }[]>(() => {
    const d = this.rawData();
    if (!d?.lichGear) return [];
    return Object.entries(d.lichGear).map(([key, items]) => ({
      key,
      name: key.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
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

  isGroupOpen(name: string): boolean {
    return this.openGroups.has(name);
  }

  toggleGroup(name: string): void {
    this.openGroups.toggle(name);
  }

  groupProgress(group: { items: string[]; isEphemera: boolean }): { completed: number; total: number } {
    if (group.isEphemera) {
      const completed = group.items.filter(item => this.trackerService.isChecked(ephemeraKey(item))).length;
      return { completed, total: group.items.length };
    }
    const total = group.items.length * 3;
    let completed = 0;
    for (const item of group.items) {
      for (const col of LICH_COLUMNS) {
        if (this.trackerService.isChecked(lichKey(item, col.key))) completed++;
      }
    }
    return { completed, total };
  }
}
