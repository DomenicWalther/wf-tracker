import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-modular-gear',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="MODULAR GEAR (LEGACY)"
      description="Track all modular gear combinations for Amps, Zaws, Kit Guns, Moas, and Hounds. This is an extreme completionist goal."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class ModularGearComponent extends ChecklistPageBase {
  readonly groups = computed(() =>
    buildFlatGroups(this.data()?.modularGear, 'mod_gear:', k => this.tracker.isChecked(k))
  );
}
