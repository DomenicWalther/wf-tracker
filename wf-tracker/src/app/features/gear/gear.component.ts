import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { GearItem } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';
import { ALL_GEAR_COLUMNS, GEAR_SECTION_COLUMNS, GearColumnDef } from '../../core/config/gear-columns';
import { createToggleSet } from '../../core/utils/toggle-set';
import { buildGearFamilies, countGearSection, gearFamilyId, gearVariantLabel } from '../../core/utils/gear-variants';

@Component({
  selector: 'app-gear',
  imports: [ReactiveFormsModule, SectionHeaderComponent, ProgressBarComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="GEAR CHECK"
        description="Track mastery and upgrades for all your gear. Enable additional columns in Settings to track Reactor, Exilus, Shards, and more."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="gear-search">
        <input class="cl-search" type="text" placeholder="Search gear..." aria-label="Search" [formControl]="searchControl" />
      </div>

      @for (section of gearSections(); track section.key) {
        @if (filteredItems(section.items).length > 0) {
          <div class="gear-section">
            <button
              type="button"
              class="gear-section-header"
              (click)="toggleSection(section.key)"
              [attr.aria-expanded]="isSectionOpen(section.key)"
            >
              <span class="gear-arrow" aria-hidden="true">{{ isSectionOpen(section.key) ? '▾' : '▸' }}</span>
              <span class="gear-section-name">{{ section.label }}</span>
              <app-progress-bar
                [label]="''"
                [completed]="sectionProgress(section).completed"
                [total]="sectionProgress(section).total"
                style="flex: 0 0 200px"
              />
            </button>
            @if (isSectionOpen(section.key)) {
              <app-tracker-table
                [columns]="sectionActiveColumns(section.key)"
                [rows]="toRows(section.items)"
                [checkedFn]="checkedFn"
                [notesFn]="notesFn"
                [setNoteFn]="setNoteFn"
                (toggle)="toggleItem($event.rowName, $event.colKey, $event.subKey)"
              />
            }
          </div>
        }
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
  `]
})
export class GearComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  private readonly openSections = createToggleSet(['warframes']);

  readonly ALL_COLUMNS: GearColumnDef[] = ALL_GEAR_COLUMNS;
  readonly SECTION_COLUMNS: Record<string, string[]> = GEAR_SECTION_COLUMNS;

  readonly primeOnlyGear = computed(() => this.tracker.settings().gear.primeOnlyGear);

  readonly activeColumns = computed(() => {
    const settings = this.tracker.settings().gear;
    return this.ALL_COLUMNS.filter(c => !c.settingKey || (settings as unknown as Record<string, unknown>)[c.settingKey]);
  });

  readonly gearSections = computed(() => {
    const d = this.data();
    if (!d?.gear) return [];
    return [
      { key: 'warframes',   label: 'Warframes',         items: d.gear['warframes']   ?? [] },
      { key: 'primaries',   label: 'Primary Weapons',   items: d.gear['primaries']   ?? [] },
      { key: 'secondaries', label: 'Secondary Weapons', items: d.gear['secondaries'] ?? [] },
      { key: 'melees',      label: 'Melee Weapons',     items: d.gear['melees']      ?? [] },
      { key: 'companions',  label: 'Companions',        items: d.gear['companions']  ?? [] },
      { key: 'archwings',   label: 'Vehicles',          items: d.gear['archwings']   ?? [] },
      { key: 'archGuns',    label: 'Archguns',          items: d.gear['archGuns']    ?? [] },
      { key: 'archMelee',   label: 'Archmelee',         items: d.gear['archMelee']   ?? [] },
      { key: 'amps',        label: 'Amps',              items: d.gear['amps']        ?? [] },
      { key: 'extras',      label: 'Extra Gear',        items: d.gear['extras']      ?? [] },
    ];
  });

  readonly progress = computed(() => {
    const sections = this.gearSections();
    const cols = this.activeColumns();
    const primeOnly = this.primeOnlyGear();
    let completed = 0, total = 0;
    for (const s of sections) {
      const p = this.sectionProgressFor(s, cols, primeOnly);
      completed += p.completed;
      total += p.total;
    }
    return { completed, total };
  });

  readonly checkedFn = (rowName: string, colKey: string, subKey?: string) => this.isChecked(subKey ?? rowName, colKey);
  readonly notesFn = (rowName: string) => this.tracker.getText(`gear:${rowName}:note`);
  readonly setNoteFn = (rowName: string, value: string) => this.tracker.setText(`gear:${rowName}:note`, value);

  isChecked(itemName: string, colKey: string): boolean {
    return this.tracker.isChecked(`gear:${itemName}:${colKey}`);
  }

  /** Mastery is keyed per variant (`subKey`); upgrade columns share the family key (`rowName`). */
  toggleItem(itemName: string, colKey: string, subKey?: string): void {
    this.tracker.toggle(`gear:${subKey ?? itemName}:${colKey}`);
  }

  private toNormalRow(item: GearItem): TrackerRow {
    return {
      name: item.name,
      tags: item.isFounderOnly ? [{ label: 'Founder', cssClass: 'tt-tag-founder' }] : [],
      rowCssClass: item.isFounderOnly ? 'founder-row' : '',
    };
  }

  /**
   * Builds table rows. With "Prime Only" on, variant families collapse into one
   * row: a per-variant Mastery checkbox group plus shared upgrade columns. With
   * it off, every item is its own full row.
   */
  toRows(items: GearItem[]): TrackerRow[] {
    const visible = this.filteredItems(items);
    if (!this.primeOnlyGear()) return visible.map(item => this.toNormalRow(item));

    // Family ids/sizes come from the full (founder-included) section so grouping
    // stays stable regardless of the founder/search filters.
    const familySize = new Map<string, number>();
    for (const f of buildGearFamilies(items.map(i => i.name))) familySize.set(f.id, f.members.length);
    const fullNames = new Set(items.map(i => i.name));

    const groups = new Map<string, GearItem[]>();
    const order: string[] = [];
    for (const item of visible) {
      const id = gearFamilyId(item.name, fullNames);
      if (!groups.has(id)) { groups.set(id, []); order.push(id); }
      groups.get(id)!.push(item);
    }

    return order.map(id => {
      const members = groups.get(id)!;
      if ((familySize.get(id) ?? 1) <= 1) return this.toNormalRow(members[0]);
      const sorted = [...members].sort((a, b) => (a.name === id ? -1 : 0) - (b.name === id ? -1 : 0));
      return {
        name: id,
        multiCells: {
          mastery: sorted.map(m => ({ key: m.name, label: gearVariantLabel(m.name, id), founder: m.isFounderOnly })),
        },
      };
    });
  }

  isSectionOpen(key: string): boolean {
    return this.openSections.has(key);
  }

  toggleSection(key: string): void {
    this.openSections.toggle(key);
  }

  sectionActiveColumns(sectionKey: string): GearColumnDef[] {
    const allowed = this.SECTION_COLUMNS[sectionKey] ?? ['mastery'];
    return this.activeColumns().filter(c => allowed.includes(c.key));
  }

  /** Founder filter only — used for progress so the bars don't react to search. */
  private founderItems(items: GearItem[]): GearItem[] {
    if (!items) return [];
    return this.tracker.settings().isFounder ? items : items.filter(i => !i.isFounderOnly);
  }

  /** Founder + search filter — used for rendering rows. */
  filteredItems(items: GearItem[]): GearItem[] {
    const base = this.founderItems(items);
    const q = this.searchQuery().toLowerCase();
    return q ? base.filter(i => i.name.toLowerCase().includes(q)) : base;
  }

  sectionProgress(section: { key: string; items: GearItem[] }): { completed: number; total: number } {
    return this.sectionProgressFor(section, this.activeColumns(), this.primeOnlyGear());
  }

  private sectionProgressFor(
    section: { key: string; items: GearItem[] },
    cols: GearColumnDef[],
    primeOnly: boolean
  ): { completed: number; total: number } {
    const sectionCols = this.SECTION_COLUMNS[section.key] ?? ['mastery'];
    const activeCols = cols.filter(c => sectionCols.includes(c.key));
    const items = this.founderItems(section.items);

    if (!primeOnly) {
      let total = 0, completed = 0;
      for (const item of items) {
        for (const col of activeCols) {
          total++;
          if (this.isChecked(item.name, col.key)) completed++;
        }
      }
      return { completed, total };
    }

    const upgradeCols = activeCols.filter(c => c.key !== 'mastery').map(c => c.key);
    return countGearSection(items.map(i => i.name), upgradeCols, (n, col) => this.isChecked(n, col));
  }
}
