import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';
import { buildFlatGroups, titleCase, applyBulkChange } from '../../core/utils/checklist.utils';

@Component({
  selector: 'app-arcanes',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="ARCANES"
        description="Track arcane collection. Standard: obtained & max rank. Arcane Psycho: all ranks collected."
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
export class ArcanesComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly groups = computed(() => {
    const raw = this.data()?.arcanes;
    if (!raw) return [];
    if (!this.tracker.settings().arcane.psycho) {
      return buildFlatGroups(raw, 'arcane:', k => this.tracker.isChecked(k));
    }
    const ranks = ['Base', 'R1', 'R2', 'R3', 'R4'];
    return Object.entries(raw).map(([group, items]) => ({
      name: titleCase(group),
      items: items.flatMap(name =>
        ranks.map((rank, i) => ({
          key: `arcane:${name}:r${i}`,
          label: `${name} (${rank})`,
          checked: this.tracker.isChecked(`arcane:${name}:r${i}`),
        }))
      ),
    }));
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
