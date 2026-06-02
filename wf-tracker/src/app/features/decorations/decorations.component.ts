import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { buildFlatGroups, applyBulkChange } from '../../core/utils/checklist.utils';

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
export class DecorationsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly groups = computed(() => {
    const raw = this.data()?.decorations;
    if (!raw) return [];
    const s = this.tracker.settings().decorations;
    const filtered = Object.fromEntries(
      Object.entries(raw).filter(([key]) => !(key === 'Tennocon Locked' && !s.extra))
    );
    return buildFlatGroups(filtered, 'dec:', k => this.tracker.isChecked(k));
  });

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    return { completed: items.filter(i => i.checked).length, total: items.length };
  });

  onToggle(key: string): void { this.tracker.toggle(key); }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    applyBulkChange(event, k => this.tracker.isChecked(k), k => this.tracker.toggle(k));
  }
}
