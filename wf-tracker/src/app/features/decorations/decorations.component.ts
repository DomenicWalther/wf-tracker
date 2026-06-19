import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-decorations',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="DECORATIONS"
      description="Track orbiter and Dojo decoration collection."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class DecorationsComponent extends ChecklistPageBase {
  readonly groups = computed(() => {
    const raw = this.data()?.decorations;
    if (!raw) return [];
    const s = this.tracker.settings().decorations;
    const filtered = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !(key === 'Tennocon Locked' && !s.extra))
    );
    return buildFlatGroups(filtered, 'dec:', k => this.tracker.isChecked(k));
  });
}
