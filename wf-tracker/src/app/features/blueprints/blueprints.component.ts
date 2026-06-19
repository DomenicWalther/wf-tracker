import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerData, ChecklistGroup, BlueprintEntry } from '../../core/models/tracker.models';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-blueprints',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="BLUEPRINTS"
      description="Track blueprint ownership. Standard: all available blueprints. BP Hoarder: includes old/impossible blueprints."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class BlueprintsComponent extends ChecklistPageBase {
  readonly groups = computed(() => {
    const d = this.data();
    if (!d?.blueprints) return [];
    return this.buildGroups(d);
  });

  private buildGroups(d: TrackerData): ChecklistGroup[] {
    const showOld = this.tracker.settings().blueprint.hoarder;
    const groups: ChecklistGroup[] = [];
    for (const [cat, vendors] of Object.entries(d.blueprints)) {
      for (const [vendor, items] of Object.entries(vendors)) {
        const filtered: BlueprintEntry[] = showOld ? items : items.filter(i => !i.isOld);
        if (!filtered.length) continue;
        groups.push({
          name: cat + ' – ' + vendor,
          items: filtered.map(i => ({
            key: 'bp:' + i.name,
            label: i.name,
            checked: this.tracker.isChecked('bp:' + i.name),
            tag: i.isOld ? 'old' : undefined,
          })),
        });
      }
    }
    return groups;
  }
}
