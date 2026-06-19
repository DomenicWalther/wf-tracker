import { Component, ChangeDetectionStrategy, input, output, computed } from '@angular/core';
import { ChecklistGroup } from '../../../core/models/tracker.models';
import { SectionHeaderComponent } from '../section-header/section-header.component';
import { ChecklistComponent } from '../checklist/checklist.component';

/**
 * The standard "section header + checklist" page shell shared by every flat
 * checklist feature (codex, items, quests, blueprints, cosmetics, …). Those
 * components now only build their `groups` and hand them here, instead of each
 * repeating this identical template + styles.
 *
 * Progress is derived from `groups` so the header count stays in sync with what
 * the checklist actually shows.
 */
@Component({
  selector: 'app-checklist-page',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        [title]="title()"
        [description]="description()"
        [completed]="progress().completed"
        [total]="progress().total"
      />
      @if (groups().length > 0) {
        <app-checklist
          [groups]="groups()"
          (toggle)="toggle.emit($event)"
          (bulkChange)="bulkChange.emit($event)"
        />
      } @else {
        <div class="loading">Loading...</div>
      }
    </div>
  `,
})
export class ChecklistPageComponent {
  readonly title = input.required<string>();
  readonly description = input.required<string>();
  readonly groups = input.required<ChecklistGroup[]>();

  readonly toggle = output<string>();
  readonly bulkChange = output<{ keys: string[]; value: boolean }>();

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    return { completed: items.filter(i => i.checked).length, total: items.length };
  });
}
