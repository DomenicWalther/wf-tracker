import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistGroup } from '../../core/models/tracker.models';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-quests',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="QUESTS"
      description="Track your quest completion across all of Warframe's story content."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
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
