import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerData, ChecklistGroup } from '../../core/models/tracker.models';
import { ChecklistPageComponent } from '../../shared/components/checklist-page/checklist-page.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-cosmetics',
  imports: [ChecklistPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-checklist-page
      title="COSMETICS"
      description="Track cosmetic items across Tennogen, Prime Access, Nightwave, and more."
      [groups]="groups()"
      (toggle)="onToggle($event)"
      (bulkChange)="onBulkChange($event)"
    />
  `,
})
export class CosmeticsComponent extends ChecklistPageBase {
  readonly groups = computed(() => {
    const d = this.data();
    if (!d) return [];
    return this.buildGroups(d);
  });

  private buildGroups(d: TrackerData): ChecklistGroup[] {
    const raw = d.cosmetics;
    if (!raw) return [];
    const s = this.tracker.settings().cosmetics;
    const groups: ChecklistGroup[] = [];
    for (const [cat, subs] of Object.entries(raw)) {
      if (cat === 'TENNOGEN' && !s.tennogen) continue;
      for (const [sub, items] of Object.entries(subs)) {
        if (cat === 'TENNOGEN' && sub === 'CONSOLE' && !s.consoleExclusive) continue;
        if (cat === 'REMAINING COSMETICS' && sub === 'Extra' && !s.extra) continue;
        const groupName = cat + (sub !== 'General' ? ' – ' + sub : '');
        groups.push({
          name: groupName,
          items: items.map(name => ({
            key: 'cos:' + name,
            label: name,
            checked: this.tracker.isChecked('cos:' + name),
          })),
        });
      }
    }
    return groups;
  }
}
