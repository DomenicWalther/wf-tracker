import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerData, ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-cosmetics',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="COSMETICS"
        description="Track cosmetic items across Tennogen, Prime Access, Nightwave, and more."
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
