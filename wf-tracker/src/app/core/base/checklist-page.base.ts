import { inject, Signal } from '@angular/core';
import { ChecklistGroup } from '../models/tracker.models';
import { TrackerService } from '../services/tracker.service';
import { DataService } from '../services/data.service';
import { applyBulkChange } from '../utils/checklist.utils';

/**
 * Shared controller for flat checklist feature pages. Subclasses only define
 * `groups`; the view is rendered by `ChecklistPageComponent`. Progress is
 * derived there (from `groups`), so it no longer lives here.
 */
export abstract class ChecklistPageBase {
  protected readonly tracker = inject(TrackerService);
  protected readonly data = inject(DataService).data;

  abstract readonly groups: Signal<ChecklistGroup[]>;

  onToggle(key: string): void { this.tracker.toggle(key); }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    applyBulkChange(event, k => this.tracker.isChecked(k), k => this.tracker.toggle(k));
  }
}
