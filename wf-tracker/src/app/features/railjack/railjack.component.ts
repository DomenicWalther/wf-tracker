import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { TrackerData, ChecklistGroup } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

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
  styles: [`
    .page { max-width: 1200px; }
    .loading { padding: 40px; text-align: center; color: var(--color-text-muted); }
  `]
})
export class RailjackComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly groups = computed(() => {
    const d = this.data();
    if (!d) return [];
    return this.buildGroups(d);
  });

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    const completed = items.filter(i => i.checked).length;
    return { completed, total: items.length };
  });

  onToggle(key: string): void {
    this.tracker.toggle(key);
  }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    event.keys.forEach(k => {
      if (this.tracker.isChecked(k) !== event.value) this.tracker.toggle(k);
    });
  }

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
          checked: this.tracker.isChecked('rj:intr:' + name)
        }))
      });
    }

    if (rj.components) {
      const byHouse: Record<string, { key: string; label: string; checked: boolean }[]> = {};
      for (const c of rj.components) {
        if (!byHouse[c.house]) byHouse[c.house] = [];
        byHouse[c.house].push({
          key: 'rj:comp:' + c.house + ':' + c.component + ':' + c.bonus,
          label: c.component + (c.bonus ? ' — ' + c.bonus : ''),
          checked: this.tracker.isChecked('rj:comp:' + c.house + ':' + c.component + ':' + c.bonus)
        });
      }
      for (const [house, items] of Object.entries(byHouse)) {
        groups.push({ name: house + ' Components', items });
      }
    }

    return groups;
  }
}
