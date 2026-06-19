import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistGroup } from '../../core/models/tracker.models';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-subsume',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="SUBSUMED ABILITIES"
      description="Track which Warframe abilities you have subsumed into the Helminth system."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class SubsumeComponent extends ChecklistPageBase {
  readonly groups = computed((): ChecklistGroup[] => {
    const raw = this.data()?.subsume;
    if (!raw) return [];
    return [{
      name: 'Subsumed Abilities',
      items: raw.map(s => ({
        key: 'subsume:' + s.warframe,
        label: s.warframe + ' — ' + s.ability,
        checked: this.tracker.isChecked('subsume:' + s.warframe),
      })),
    }];
  });
}
