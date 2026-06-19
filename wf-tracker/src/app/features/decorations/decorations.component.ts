import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-decorations',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="DECORATIONS"
        description="Track orbiter and Dojo decoration collection."
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
