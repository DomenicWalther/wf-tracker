import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { TrackerData, ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

@Component({
  selector: 'app-market',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="MARKET"
        description="Track market items including emotes, animations, themes, and exclusive items."
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
  styles: [`
    .page { max-width: 1200px; }
    .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }
  `]
})
export class MarketComponent {
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
    const completed = items.filter(i => i.checked).length;
    return { completed, total: items.length };
  });

  onToggle(key: string): void {
    this.tracker.toggle(key);
  }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    event.keys.forEach(k => {
      if (this.tracker.isChecked(k) !== event.value) this.tracker.toggle(k);
    });
  }

  private buildGroups(d: TrackerData): ChecklistGroup[] {
    const raw = d.market;
    if (!raw) return [];
    return Object.entries(raw).map(([group, items]) => ({
      name: group.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      items: items.map(name => ({
        key: 'market:' + name,
        label: name,
        checked: this.tracker.isChecked('market:' + name)
      }))
    }));
  }
}
