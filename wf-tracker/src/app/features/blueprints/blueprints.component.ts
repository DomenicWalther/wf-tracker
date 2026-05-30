import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

@Component({
  selector: 'app-blueprints',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ChecklistComponent],
  template: `
    <div class="page">
      <app-section-header
        title="BLUEPRINTS"
        description="Track blueprint ownership. Standard: all available blueprints. BP Hoarder: includes old/impossible blueprints."
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
export class BlueprintsComponent implements OnInit {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = signal<any>(null);

  readonly groups = computed(() => {
    const d = this.data();
    if (!d?.blueprints) return [];
    const showOld = this.tracker.settings().blueprint.hoarder;
    const groups = [];
    for (const [cat, vendors] of Object.entries(d.blueprints as Record<string, Record<string, { name: string; isOld: boolean }[]>>)) {
      for (const [vendor, items] of Object.entries(vendors)) {
        const filtered = showOld ? items : items.filter(i => !i.isOld);
        if (!filtered.length) continue;
        groups.push({
          name: cat + ' – ' + vendor,
          items: filtered.map(i => ({
            key: 'bp:' + i.name,
            label: i.name,
            checked: this.tracker.isChecked('bp:' + i.name),
            tag: i.isOld ? 'old' : undefined
          }))
        });
      }
    }
    return groups;
  });

  readonly progress = computed(() => {
    const items = this.groups().flatMap(g => g.items);
    return { completed: items.filter(i => i.checked).length, total: items.length };
  });

  ngOnInit(): void {
    this.dataService.getData().subscribe(d => this.data.set(d));
  }

  onToggle(key: string): void {
    this.tracker.toggle(key);
    this.data.set({ ...this.data() });
  }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    event.keys.forEach(k => { if (this.tracker.isChecked(k) !== event.value) this.tracker.toggle(k); });
    this.data.set({ ...this.data() });
  }
}
