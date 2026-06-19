import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-collectable',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="COLLECTABLE"
      description="Track glyphs, sigils, ephemera, sumdali, scenes, emblems, and more."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class CollectableComponent extends ChecklistPageBase {
  readonly groups = computed(() => {
    const raw = this.data()?.collectable;
    if (!raw) return [];
    const s = this.tracker.settings().collectable;
    const filtered = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !(key === 'OLD IMPOSSIBLE GLYPHS' && !s.old))
    );
    return buildFlatGroups(filtered, 'col:', k => this.tracker.isChecked(k));
  });
}
