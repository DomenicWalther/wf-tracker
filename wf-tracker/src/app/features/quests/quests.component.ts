import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-quests',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="QUESTS"
        description="Track your quest completion across all of Warframe's story content."
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
export class QuestsComponent extends ChecklistPageBase {
  readonly groups = computed((): ChecklistGroup[] => {
    const raw = this.data()?.quests;
    if (!raw) return [];
    return [{
      name: 'All',
      items: raw.map(name => ({
        key: 'quest:' + name,
        label: name,
        checked: this.tracker.isChecked('quest:' + name),
      })),
    }];
  });
}
