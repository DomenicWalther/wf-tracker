import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-accolade',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="ACCOLADE GLYPHS"
      description="Glyphs earned by defeating Hardmode bosses solo with specific Warframes. State is shared with the Collectable tab."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class AccoladeComponent extends ChecklistPageBase {
  readonly groups = computed(() => {
    const raw = this.data()?.accolade;
    if (!raw) return [];
    return buildFlatGroups(raw, 'col:', k => this.tracker.isChecked(k));
  });
}
