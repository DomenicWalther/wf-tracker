import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

@Component({
  selector: 'app-mods',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="MOD COLLECTION"
        description="Track your mod collection. Standard: owned & maxed. Mod Hoarder: all rank duplicates."
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
export class ModsComponent implements OnInit {
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
    const raw = d['mods'];
    if (!raw) return [];
    
    if (Array.isArray(raw)) {
      const byCategory: Record<string, { key: string; label: string; checked: boolean }[]> = {};
      for (const mod of (raw as { name: string; maxRank: number; category: string }[])) {
        const cat = mod.category || 'General';
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push({
          key: 'mod:' + mod.name,
          label: mod.name + ' (R' + mod.maxRank + ')',
          checked: this.tracker.isChecked('mod:' + mod.name)
        });
      }
      return Object.entries(byCategory).map(([name, items]) => ({ name, items }));
    }
    return [];
  }
}
