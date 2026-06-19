import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-extra',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="EXTRA"
      description="Track extra content: junctions, starchart, focus trees, arcane helmets, landing craft, and more."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class ExtraComponent extends ChecklistPageBase {
  readonly groups = computed(() =>
    buildFlatGroups(this.data()?.extra, 'extra:', k => this.tracker.isChecked(k))
  );
}
