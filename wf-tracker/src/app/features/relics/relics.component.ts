import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

@Component({
  selector: 'app-relics',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ChecklistComponent],
  template: `
    <div class="page">
      <app-section-header
        title="RELICS"
        description="Track relic ownership and refinement. Standard: owned. Hoarder: Exceptional/Flawless/Radiant."
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
export class RelicsComponent implements OnInit {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = signal<any>(null);

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

  ngOnInit(): void {
    this.dataService.getData().subscribe(d => this.data.set(d));
  }

  onToggle(key: string): void {
    this.tracker.toggle(key);
    this.data.set({ ...this.data() });
  }

  onBulkChange(event: { keys: string[]; value: boolean }): void {
    event.keys.forEach(k => {
      if (this.tracker.isChecked(k) !== event.value) this.tracker.toggle(k);
    });
    this.data.set({ ...this.data() });
  }

  private buildGroups(d: any): any[] {
    const raw = d['relics'];
    if (!raw) return [];
    
    if (typeof raw === 'object' && !Array.isArray(raw)) {
      return Object.entries(raw as Record<string, string[]>).map(([group, items]) => ({
        name: group.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        items: items.map(name => ({
          key: 'relic:' + name,
          label: name,
          checked: this.tracker.isChecked('relic:' + name)
        }))
      }));
    }
    return [];
  }
}
