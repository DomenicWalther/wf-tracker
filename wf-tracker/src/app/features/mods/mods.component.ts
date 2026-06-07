import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { TrackerTableComponent, TrackerColumn, TrackerRow } from '../../shared/components/tracker-table/tracker-table.component';

@Component({
  selector: 'app-mods',
  imports: [SectionHeaderComponent, TrackerTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="MOD COLLECTION"
        description="Track your mod collection. Standard: owned & maxed. Mod Hoarder: one copy at every rank."
        [completed]="progress().completed"
        [total]="progress().total"
      />
      @if (rows().length > 0) {
        <app-tracker-table
          [columns]="columns()"
          [rows]="rows()"
          [checkedFn]="checkedFn"
          [disabledCellFn]="disabledCellFn()"
          (toggle)="onToggle($event)"
        />
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
  styles: [`.page { max-width: 1200px; } .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }`]
})
export class ModsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly columns = computed<TrackerColumn[]>(() => {
    if (!this.tracker.settings().mod.hoarder) {
      return [
        { key: 'owned', label: 'Owned' },
        { key: 'maxed', label: 'Maxed' },
      ];
    }
    const maxRank = (this.data()?.mods ?? []).reduce((m, mod) => Math.max(m, mod.maxRank), 0);
    return Array.from({ length: maxRank + 1 }, (_, i) => ({ key: `r${i}`, label: `R${i}` }));
  });

  readonly rows = computed<TrackerRow[]>(() =>
    (this.data()?.mods ?? []).map(mod => ({
      name: mod.name,
      group: mod.category,
    }))
  );

  /**
   * In hoarder mode, disable cells for ranks beyond a mod's max rank.
   * Returns null in normal mode (no cells disabled).
   */
  readonly disabledCellFn = computed<((rowName: string, colKey: string) => boolean) | null>(() => {
    if (!this.tracker.settings().mod.hoarder) return null;
    const modMap = new Map((this.data()?.mods ?? []).map(m => [m.name, m.maxRank]));
    return (rowName: string, colKey: string) => {
      const rank = parseInt(colKey.slice(1), 10); // 'r5' → 5
      return rank > (modMap.get(rowName) ?? 0);
    };
  });

  /** Stable arrow function — reads a signal internally so Angular's reactive graph stays connected. */
  readonly checkedFn = (rowName: string, colKey: string): boolean =>
    this.tracker.isChecked(`mod:${rowName}:${colKey}`);

  readonly progress = computed(() => {
    const mods = this.data()?.mods ?? [];
    const hoarder = this.tracker.settings().mod.hoarder;
    let completed = 0, total = 0;
    for (const mod of mods) {
      if (hoarder) {
        for (let r = 0; r <= mod.maxRank; r++) {
          total++;
          if (this.tracker.isChecked(`mod:${mod.name}:r${r}`)) completed++;
        }
      } else {
        total += 2; // owned + maxed
        if (this.tracker.isChecked(`mod:${mod.name}:owned`)) completed++;
        if (this.tracker.isChecked(`mod:${mod.name}:maxed`)) completed++;
      }
    }
    return { completed, total };
  });

  onToggle(event: { rowName: string; colKey: string; subKey?: string }): void {
    this.tracker.toggle(`mod:${event.rowName}:${event.colKey}`);
  }
}
