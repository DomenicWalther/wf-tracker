import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { ChecklistComponent } from '../../shared/components/checklist/checklist.component';

@Component({
  selector: 'app-subsume',
  imports: [SectionHeaderComponent, ChecklistComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="SUBSUMED ABILITIES"
        description="Track which Warframe abilities you have subsumed into the Helminth system."
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
export class SubsumeComponent implements OnInit {
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
    const raw = d['subsume'];
    if (!raw) return [];
    
    if (Array.isArray(raw)) {
      return [{
        name: 'Subsumed Abilities',
        items: (raw as { warframe: string; ability: string }[]).map(s => ({
          key: 'subsume:' + s.warframe,
          label: s.warframe + ' — ' + s.ability,
          checked: this.tracker.isChecked('subsume:' + s.warframe)
        }))
      }];
    }
    return [];
  }
}
