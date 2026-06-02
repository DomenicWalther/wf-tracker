import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { buildFlatGroups, titleCase, applyBulkChange } from '../../core/utils/checklist.utils';

@Component({
  selector: 'app-relics',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="RELICS"
        description="Track relic ownership and refinement. Standard: owned. Hoarder: Exceptional/Flawless/Radiant."
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
export class RelicsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly groups = computed(() => {
    const raw = this.data()?.relics;
    if (!raw) return [];
    if (!this.tracker.settings().relic.hoarder) {
      return buildFlatGroups(raw, 'relic:', k => this.tracker.isChecked(k));
    }
    return Object.entries(raw).map(([group, items]) => ({
      name: titleCase(group),
      items: items.flatMap(name => [
        { key: `relic:${name}`,            label: name,                     checked: this.tracker.isChecked(`relic:${name}`) },
        { key: `relic:${name}:exceptional`, label: `${name} (Exceptional)`, checked: this.tracker.isChecked(`relic:${name}:exceptional`) },
        { key: `relic:${name}:flawless`,    label: `${name} (Flawless)`,    checked: this.tracker.isChecked(`relic:${name}:flawless`) },
        { key: `relic:${name}:radiant`,     label: `${name} (Radiant)`,     checked: this.tracker.isChecked(`relic:${name}:radiant`) },
      ]),
    }));
  });

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    return { completed: items.filter(i => i.checked).length, total: items.length };
  });

  onToggle(key: string): void { this.tracker.toggle(key); }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    applyBulkChange(event, k => this.tracker.isChecked(k), k => this.tracker.toggle(k));
  }
}
