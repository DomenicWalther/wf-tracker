import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-codex',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="CODEX"
      description="Track codex scans for objects, enemies, fragments, somachord, frame fighter, and prex cards."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class CodexComponent extends ChecklistPageBase {
  readonly groups = computed(() =>
    buildFlatGroups(this.data()?.codex, 'codex:', k => this.tracker.isChecked(k))
  );
}
