import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { TrackerData, ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { applyBulkChange } from '../../core/utils/checklist.utils';

@Component({
  selector: 'app-mods',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="MOD COLLECTION"
        description="Track your mod collection. Standard: owned & maxed. Mod Hoarder: all rank duplicates."
        [completed]="progress().completed"
        [total]="progress().total"
      />
      @if (groups().length > 0) {
        <app-checklist
          [groups]="groups()"
          (toggle)="onToggle($event)"
          (bulkChange)="onBulkChange($event)"
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

  readonly groups = computed(() => {
    const d = this.data();
    if (!d) return [];
    return this.buildGroups(d);
  });

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    return { completed: items.filter(i => i.checked).length, total: items.length };
  });

  onToggle(key: string): void { this.tracker.toggle(key); }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    applyBulkChange(event, k => this.tracker.isChecked(k), k => this.tracker.toggle(k));
  }

  private buildGroups(d: TrackerData): ChecklistGroup[] {
    const raw = d.mods;
    if (!raw) return [];
    const hoarder = this.tracker.settings().mod.hoarder;
    const byCategory: Record<string, { key: string; label: string; checked: boolean }[]> = {};
    for (const mod of raw) {
      const cat = mod.category || 'General';
      if (!byCategory[cat]) byCategory[cat] = [];
      if (hoarder) {
        for (let r = 0; r <= mod.maxRank; r++) {
          const key = `mod:${mod.name}:r${r}`;
          byCategory[cat].push({ key, label: `${mod.name} (R${r})`, checked: this.tracker.isChecked(key) });
        }
      } else {
        const key = `mod:${mod.name}`;
        byCategory[cat].push({ key, label: `${mod.name} (R${mod.maxRank})`, checked: this.tracker.isChecked(key) });
      }
    }
    return Object.entries(byCategory).map(([name, items]) => ({ name, items }));
  }
}
