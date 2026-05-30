import { Component, inject, computed, ChangeDetectionStrategy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ProgressBarComponent } from '../../shared/components/progress-bar/progress-bar.component';

@Component({
  selector: 'app-lich-gear',
  imports: [ReactiveFormsModule, SectionHeaderComponent, ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="LICH GEAR"
        description="Track Kuva, Tenet, and Coda weapons. Each weapon needs to be obtained, reach 60%+ element, and achieve Valence Fusion."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="gear-search">
        <input class="cl-search" type="text" placeholder="Search weapons..." [formControl]="searchControl" />
      </div>

      @for (group of filteredGroups(); track group.name) {
        <div class="gear-section">
          <div class="gear-section-header" (click)="toggleGroup(group.name)">
            <span class="gear-arrow">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
            <span class="gear-section-name">{{ group.name }}</span>
            <app-progress-bar
              [label]="''"
              [completed]="groupProgress(group).completed"
              [total]="groupProgress(group).total"
              style="flex: 0 0 200px"
            />
          </div>
          @if (isGroupOpen(group.name)) {
            <div class="gear-table-wrapper">
              <table class="gear-table">
                <thead>
                  <tr>
                    <th class="col-name">Name</th>
                    <th class="col-check">Obtained</th>
                    <th class="col-check">60%</th>
                    <th class="col-check">Val. Fusion</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of group.items; track item) {
                    <tr>
                      <td class="col-name">{{ item }}</td>
                      <td class="col-check">
                        <input type="checkbox" class="wf-checkbox"
                          [checked]="isChecked(item, 'obtained')"
                          (change)="toggle(item, 'obtained')" />
                      </td>
                      <td class="col-check">
                        <input type="checkbox" class="wf-checkbox"
                          [checked]="isChecked(item, '60')"
                          (change)="toggle(item, '60')" />
                      </td>
                      <td class="col-check">
                        <input type="checkbox" class="wf-checkbox"
                          [checked]="isChecked(item, 'vf')"
                          (change)="toggle(item, 'vf')" />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
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
    }
    .gear-section-header:hover { background: #1e1e2c; }
    .gear-arrow { color: var(--color-gold); width: 12px; font-size: 12px; }
    .gear-section-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .gear-table-wrapper { overflow-x: auto; }
    .gear-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .gear-table th {
      background: #111119;
      padding: 6px 10px;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      border-bottom: 1px solid var(--color-border);
    }
    .gear-table th.col-name { text-align: left; }
    .gear-table td {
      padding: 5px 10px;
      border-bottom: 1px solid var(--color-border);
      text-align: center;
    }
    .gear-table td.col-name { text-align: left; color: var(--color-text); white-space: nowrap; }
    .gear-table tr:hover td { background: var(--color-surface2); }
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
  private readonly rawData = toSignal(this.dataService.getData());
  private readonly openGroups = signal<Set<string>>(new Set());

  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly groups = computed<{ name: string; items: string[] }[]>(() => {
    const d = this.rawData();
    if (!d?.lichGear) return [];
    return Object.entries(d.lichGear).map(([group, items]) => ({
      name: group.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      items
    }));
  });

  readonly filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.groups().map(g => ({
      ...g,
      items: q ? g.items.filter(i => i.toLowerCase().includes(q)) : g.items
    })).filter(g => g.items.length > 0);
  });

  readonly progress = computed(() => {
    let completed = 0, total = 0;
    for (const g of this.groups()) {
      for (const item of g.items) {
        total += 3;
        if (this.trackerService.isChecked('lich:' + item)) completed++;
        if (this.trackerService.isChecked('lich:' + item + ':60')) completed++;
        if (this.trackerService.isChecked('lich:' + item + ':vf')) completed++;
      }
    }
    return { completed, total };
  });

  isChecked(item: string, col: string): boolean {
    const key = col === 'obtained' ? 'lich:' + item : 'lich:' + item + ':' + col;
    return this.trackerService.isChecked(key);
  }

  toggle(item: string, col: string): void {
    const key = col === 'obtained' ? 'lich:' + item : 'lich:' + item + ':' + col;
    this.trackerService.toggle(key);
  }

  isGroupOpen(name: string): boolean {
    return this.openGroups().has(name);
  }

  toggleGroup(name: string): void {
    this.openGroups.update(s => {
      const next = new Set(s);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  groupProgress(group: { items: string[] }): { completed: number; total: number } {
    let completed = 0;
    const total = group.items.length * 3;
    for (const item of group.items) {
      if (this.trackerService.isChecked('lich:' + item)) completed++;
      if (this.trackerService.isChecked('lich:' + item + ':60')) completed++;
      if (this.trackerService.isChecked('lich:' + item + ':vf')) completed++;
    }
    return { completed, total };
  }
}
