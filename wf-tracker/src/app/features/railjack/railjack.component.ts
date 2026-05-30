import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

@Component({
  selector: 'app-railjack',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent, ChecklistComponent],
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
export class RailjackComponent implements OnInit {
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
    const raw = d['railjack'];
    if (!raw) return [];
    
    if (typeof raw === 'object') {
      const groups = [];
      const intr = raw.intrinsics as string[];
      if (intr) {
        groups.push({
          name: 'Intrinsics (Level 10)',
          items: intr.map((name: string) => ({
            key: 'rj:intr:' + name,
            label: name + ' Level 10',
            checked: this.tracker.isChecked('rj:intr:' + name)
          }))
        });
      }
      const comps = raw.components as { house: string; component: string; bonus: string }[];
      if (comps) {
        const byHouse: Record<string, any[]> = {};
        for (const c of comps) {
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
    return [];
  }
}
