import { computed, inject, Signal } from '@angular/core';
import { ChecklistGroup } from '../models/tracker.models';
import { TrackerService } from '../services/tracker.service';
import { DataService } from '../services/data.service';
import { applyBulkChange } from '../utils/checklist.utils';

export abstract class ChecklistPageBase {
  protected readonly tracker = inject(TrackerService);
  protected readonly data = inject(DataService).data;

  abstract readonly groups: Signal<ChecklistGroup[]>;

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    return { completed: items.filter(i => i.checked).length, total: items.length };
  });

  onToggle(key: string): void { this.tracker.toggle(key); }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    applyBulkChange(event, k => this.tracker.isChecked(k), k => this.tracker.toggle(k));
  }
}
