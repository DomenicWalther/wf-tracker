import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { buildFlatGroups } from '../../core/utils/checklist.utils';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-collectable',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="COLLECTABLE"
        description="Track glyphs, sigils, ephemera, sumdali, scenes, emblems, and more."
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
