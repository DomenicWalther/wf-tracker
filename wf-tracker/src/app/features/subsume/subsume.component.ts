import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-subsume',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="SUBSUMED ABILITIES"
        description="Track which Warframe abilities you have subsumed into the Helminth system."
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
export class SubsumeComponent extends ChecklistPageBase {
  readonly groups = computed((): ChecklistGroup[] => {
    const raw = this.data()?.subsume;
    if (!raw) return [];
    return [{
      name: 'Subsumed Abilities',
      items: raw.map(s => ({
        key: 'subsume:' + s.warframe,
        label: s.warframe + ' — ' + s.ability,
        checked: this.tracker.isChecked('subsume:' + s.warframe),
      })),
    }];
  });
}
