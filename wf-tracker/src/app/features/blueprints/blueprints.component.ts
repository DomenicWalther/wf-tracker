import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerData, ChecklistGroup, BlueprintEntry } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-blueprints',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="BLUEPRINTS"
        description="Track blueprint ownership. Standard: all available blueprints. BP Hoarder: includes old/impossible blueprints."
        [completed]="progress().completed"
        [total]="progress().total"
      />
      @if (groups().length > 0) {
        <app-checklist
          [groups]="groups()"
          (toggle)="onToggle($event)"
          (bulkChange)="onBulkChange($event)"
        />
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
  styles: [`.page { max-width: 1200px; } .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }`]
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
