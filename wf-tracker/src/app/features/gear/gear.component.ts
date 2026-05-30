import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { GearItem } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';

interface GearColumn {
  key: string;
  label: string;
  settingKey?: string;
}

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
                [rows]="toRows(filteredItems(section.items))"
                [checkedFn]="checkedFn"
                [disabledCellFn]="makeDisabledCellFn(section)"
                [notesFn]="notesFn"
                [setNoteFn]="setNoteFn"
                (toggle)="toggleItem($event.rowName, $event.colKey)"
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
    .gear-section-header:hover { background: #1e1e2c; }
    .gear-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .gear-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    :host ::ng-deep .tt-tag-founder { color: #ff9a3c; }
  `]
})
export class GearComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  private readonly openSections = signal<Set<string>>(new Set(['warframes']));

  readonly ALL_COLUMNS: GearColumn[] = [
    { key: 'mastery', label: 'Mastery' },
    { key: 'reactor', label: 'Reactor', settingKey: 'reactor' },
    { key: 'exilus', label: 'Exilus', settingKey: 'exilus' },
    { key: 'shards', label: '5 Shards', settingKey: 'shards' },
    { key: 'tau', label: 'Tau', settingKey: 'tauForged' },
    { key: 'maxBuild', label: 'Max Build', settingKey: 'maxBuild' },
    { key: 'auraForma', label: 'Aura Forma', settingKey: 'auraForma' },
    { key: 'stanceForma', label: 'Stance Forma', settingKey: 'stanceForma' },
    { key: 'lens', label: 'Lens', settingKey: 'lens' },
    { key: 'arcaneAdapter', label: 'Arcane Adapter', settingKey: 'arcaneAdapter' },
  ];

  readonly SECTION_COLUMNS: Record<string, string[]> = {
    warframes: ['mastery', 'reactor', 'exilus', 'shards', 'tau', 'maxBuild', 'auraForma', 'lens'],
    primaries: ['mastery', 'reactor', 'arcaneAdapter', 'maxBuild'],
    secondaries: ['mastery', 'reactor', 'arcaneAdapter', 'maxBuild'],
    melees: ['mastery', 'reactor', 'arcaneAdapter', 'maxBuild', 'stanceForma'],
    companions: ['mastery', 'maxBuild'],
    archwings: ['mastery', 'maxBuild'],
    archwingWeapons: ['mastery', 'maxBuild'],
    extras: ['mastery', 'maxBuild'],
  };

  readonly primeOnlyGear = computed(() => this.tracker.settings().gear.primeOnlyGear);

  readonly activeColumns = computed(() => {
    const settings = this.tracker.settings().gear;
    return this.ALL_COLUMNS.filter(c => !c.settingKey || settings[c.settingKey as keyof typeof settings]);
  });

  readonly gearSections = computed(() => {
    const d = this.data();
    if (!d?.gear) return [];
    return [
      { key: 'warframes', label: 'Warframes', items: d.gear['warframes'] ?? [] },
      { key: 'primaries', label: 'Primary Weapons', items: d.gear['primaries'] ?? [] },
      { key: 'secondaries', label: 'Secondary Weapons', items: d.gear['secondaries'] ?? [] },
      { key: 'melees', label: 'Melee Weapons', items: d.gear['melees'] ?? [] },
      { key: 'companions', label: 'Companions', items: d.gear['companions'] ?? [] },
      { key: 'archwings', label: 'Archwings', items: d.gear['archwings'] ?? [] },
      { key: 'archwingWeapons', label: 'Archwing Weapons', items: d.gear['archwingWeapons'] ?? [] },
      { key: 'extras', label: 'Extra Gear', items: d.gear['extras'] ?? [] },
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

  readonly checkedFn = (rowName: string, colKey: string) => this.isChecked(rowName, colKey);
  readonly notesFn = (rowName: string) => this.tracker.getText(`gear:${rowName}:note`);
  readonly setNoteFn = (rowName: string, value: string) => this.tracker.setText(`gear:${rowName}:note`, value);

  isChecked(itemName: string, colKey: string): boolean {
    return this.tracker.isChecked(`gear:${itemName}:${colKey}`);
  }

  toggleItem(itemName: string, colKey: string): void {
    this.tracker.toggle(`gear:${itemName}:${colKey}`);
  }

  toRows(items: GearItem[]): TrackerRow[] {
    return items.map(item => ({
      name: item.name,
      tags: item.isFounderOnly ? [{ label: 'Founder', cssClass: 'tt-tag-founder' }] : [],
      rowCssClass: item.isFounderOnly ? 'founder-row' : '',
    }));
  }

  isSectionOpen(key: string): boolean {
    return this.openSections().has(key);
  }

  toggleSection(key: string): void {
    this.openSections.update(s => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  sectionHasExtraColumns(sectionKey: string): boolean {
    const allowed = this.SECTION_COLUMNS[sectionKey] ?? ['mastery'];
    return allowed.some(k => k !== 'mastery');
  }

  /** Returns true for non-prime items that have a prime counterpart in the section. */
  private isGearDisabled(itemName: string, colKey: string, primeNames: Set<string>): boolean {
    if (colKey === 'mastery') return false;
    return primeNames.has(itemName + ' Prime') && !itemName.endsWith(' Prime');
  }

  makeDisabledCellFn(section: { key: string; items: GearItem[] }): ((rowName: string, colKey: string) => boolean) | null {
    if (!this.primeOnlyGear() || !this.sectionHasExtraColumns(section.key)) return null;
    const primeNames = new Set(this.filteredItems(section.items).map(i => i.name));
    return (rowName, colKey) => this.isGearDisabled(rowName, colKey, primeNames);
  }

  sectionActiveColumns(sectionKey: string): GearColumn[] {
    const allowed = this.SECTION_COLUMNS[sectionKey] ?? ['mastery'];
    return this.activeColumns().filter(c => allowed.includes(c.key));
  }

  filteredItems(items: GearItem[]): GearItem[] {
    if (!items) return [];
    const showFounder = this.tracker.settings().isFounder;
    const base = showFounder ? items : items.filter(i => !i.isFounderOnly);
    const q = this.searchQuery().toLowerCase();
    return q ? base.filter(i => i.name.toLowerCase().includes(q)) : base;
  }

  sectionProgress(section: { key: string; items: GearItem[] }): { completed: number; total: number } {
    return this.sectionProgressFor(section, this.activeColumns(), this.primeOnlyGear());
  }

  private sectionProgressFor(
    section: { key: string; items: GearItem[] },
    cols: GearColumn[],
    primeOnly: boolean
  ): { completed: number; total: number } {
    const sectionCols = this.SECTION_COLUMNS[section.key] ?? ['mastery'];
    const activeCols = cols.filter(c => sectionCols.includes(c.key));
    const items = this.filteredItems(section.items);
    const disabledFn = primeOnly ? this.makeDisabledCellFn(section) : null;
    let total = 0, completed = 0;
    for (const item of items) {
      for (const col of activeCols) {
        if (disabledFn?.(item.name, col.key)) continue;
        total++;
        if (this.isChecked(item.name, col.key)) completed++;
      }
    }
    return { completed, total };
  }
}
