import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

interface IncFamilyCard {
  key: string;
  name: string;
  weapons: string[];
  checked: boolean;
}

@Component({
  selector: 'app-incarnon',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionHeaderComponent],
  template: `
    <div class="page">
      <app-section-header
        title="INCARNON"
        description="Track Incarnon adapter acquisition across all weapon families."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="controls">
        <input
          class="search"
          type="text"
          placeholder="Search families..."
          [(ngModel)]="searchQuery"
        />
        <span class="stats">
          <span class="done">{{ progress().completed }}</span>
          <span class="sep">/</span>
          <span class="tot">{{ filteredCards().length }}</span>
        </span>
        <button class="btn" (click)="checkAll()">✓ All</button>
        <button class="btn" (click)="uncheckAll()">✗ None</button>
      </div>

      @if (cards().length === 0) {
        <div class="loading">Loading...</div>
      } @else if (filteredCards().length === 0) {
        <div class="empty">No families match "{{ searchQuery }}"</div>
      } @else {
        <div class="grid">
          @for (card of filteredCards(); track card.key) {
            <div class="card" [class.done]="card.checked" (click)="toggle(card.key)">
              <div class="card-top">
                <span class="checkbox" [class.checked]="card.checked">
                  {{ card.checked ? '✓' : '' }}
                </span>
                <span class="family-name">{{ card.name }}</span>
              </div>
              @if (card.weapons.length > 1) {
                <div class="variants">
                  @for (w of card.weapons; track w) {
                    <span class="variant-tag">{{ w }}</span>
                  }
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .loading, .empty { padding: 40px; text-align: center; color: var(--color-text-muted); font-size: 13px; }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }
    .search {
      flex: 1;
      min-width: 180px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }
    .search:focus { border-color: var(--color-gold); }
    .stats { font-size: 13px; color: var(--color-text-muted); white-space: nowrap; }
    .done { color: var(--color-gold); font-weight: 600; }
    .sep { margin: 0 2px; }
    .btn {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn:hover { border-color: var(--color-gold); color: var(--color-gold); }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 8px;
    }

    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      padding: 10px 12px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;
      user-select: none;
    }
    .card:hover { border-color: var(--color-gold); background: var(--color-surface2); }
    .card.done { border-color: var(--color-gold); opacity: 0.55; }
    .card.done:hover { opacity: 0.75; }

    .card-top {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .checkbox {
      width: 16px;
      height: 16px;
      border: 1.5px solid var(--color-border);
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      color: var(--color-gold);
      flex-shrink: 0;
      transition: border-color 0.15s, background 0.15s;
    }
    .checkbox.checked {
      background: var(--color-gold);
      border-color: var(--color-gold);
      color: #000;
      font-weight: 700;
    }

    .family-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
      letter-spacing: 0.02em;
    }
    .card.done .family-name {
      color: var(--color-text-muted);
      text-decoration: line-through;
      text-decoration-color: var(--color-gold);
    }

    .variants {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 7px;
    }
    .variant-tag {
      font-size: 10px;
      color: var(--color-text-muted);
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 1px 5px;
      line-height: 1.5;
    }
  `]
})
export class IncarnonComponent implements OnInit {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = signal<any>(null);

  searchQuery = '';

  readonly cards = computed<IncFamilyCard[]>(() => {
    const d = this.data();
    if (!d) return [];
    const raw: { name: string; weapons: string[] }[] = d['incarnon'] ?? [];
    const cards: IncFamilyCard[] = [];
    for (const family of raw) {
      if (family.name === '1 FAMILY') {
        for (const w of family.weapons) {
          cards.push({ key: 'incarnon:family:' + w, name: w, weapons: [], checked: this.tracker.isChecked('incarnon:family:' + w) });
        }
      } else {
        cards.push({ key: 'incarnon:family:' + family.name, name: family.name, weapons: family.weapons, checked: this.tracker.isChecked('incarnon:family:' + family.name) });
      }
    }
    return cards;
  });

  readonly filteredCards = computed(() => {
    const q = this.searchQuery.toLowerCase();
    return q
      ? this.cards().filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.weapons.some(w => w.toLowerCase().includes(q))
        )
      : this.cards();
  });

  readonly progress = computed(() => {
    const all = this.cards();
    return { completed: all.filter(c => c.checked).length, total: all.length };
  });

  ngOnInit(): void {
    this.dataService.getData().subscribe(d => this.data.set(d));
  }

  toggle(key: string): void {
    this.tracker.toggle(key);
    this.data.set({ ...this.data() });
  }

  checkAll(): void {
    this.filteredCards().filter(c => !c.checked).forEach(c => this.tracker.toggle(c.key));
    this.data.set({ ...this.data() });
  }

  uncheckAll(): void {
    this.filteredCards().filter(c => c.checked).forEach(c => this.tracker.toggle(c.key));
    this.data.set({ ...this.data() });
  }
}
