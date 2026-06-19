import { Component, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerData, ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { ChecklistPageBase } from '../../core/base/checklist-page.base';

@Component({
  selector: 'app-railjack',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="RAILJACK"
        description="Track Railjack intrinsics (level 10) and component collection."
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
export class RailjackComponent extends ChecklistPageBase {
  readonly groups = computed(() => {
    const d = this.data();
    if (!d) return [];
    return this.buildGroups(d);
  });

  private buildGroups(d: TrackerData): ChecklistGroup[] {
    const rj = d.railjack;
    if (!rj) return [];

    const groups: ChecklistGroup[] = [];

    if (rj.intrinsics) {
      groups.push({
        name: 'Intrinsics (Level 10)',
        items: rj.intrinsics.map(name => ({
          key: 'rj:intr:' + name,
          label: name + ' Level 10',
          checked: this.tracker.isChecked('rj:intr:' + name),
        })),
      });
    }

    if (rj.components) {
      const partHoarder = this.tracker.settings().railjack.partHoarder;
      const byHouse: Record<string, { key: string; label: string; checked: boolean }[]> = {};
      const seen = new Set<string>();
      for (const c of rj.components) {
        if (!byHouse[c.house]) byHouse[c.house] = [];
        if (partHoarder) {
          byHouse[c.house].push({
            key: 'rj:comp:' + c.house + ':' + c.component + ':' + c.bonus,
            label: c.component + (c.bonus && c.bonus !== 'None' ? ' — ' + c.bonus : ''),
            checked: this.tracker.isChecked('rj:comp:' + c.house + ':' + c.component + ':' + c.bonus),
          });
        } else {
          const dedupeKey = c.house + ':' + c.component;
          if (!seen.has(dedupeKey)) {
            seen.add(dedupeKey);
            byHouse[c.house].push({
              key: 'rj:comp:' + c.house + ':' + c.component,
              label: c.component,
              checked: this.tracker.isChecked('rj:comp:' + c.house + ':' + c.component),
            });
          }
        }
      }
      for (const [house, items] of Object.entries(byHouse)) {
        groups.push({ name: house + ' Components', items });
      }
    }

    return groups;
  }
}
