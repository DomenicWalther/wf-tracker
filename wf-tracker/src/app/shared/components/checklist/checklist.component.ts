import { Component, Input, Output, EventEmitter, signal, computed, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cl-wrapper">
      <div class="cl-controls">
        <input
          class="cl-search"
          type="text"
          placeholder="Search..."
          [(ngModel)]="searchQuery"
          (ngModelChange)="onSearch($event)"
        />
        <div class="cl-stats">
          <span class="cl-done">{{ checkedCount() }}</span>
          <span class="cl-sep">/</span>
          <span class="cl-total">{{ filteredItems().length }}</span>
        </div>
        <button class="cl-btn" (click)="checkAll()" title="Check all visible">✓ All</button>
        <button class="cl-btn" (click)="uncheckAll()" title="Uncheck all visible">✗ None</button>
      </div>

      @for (group of filteredGroups(); track group.name) {
        <div class="cl-group">
          <div class="cl-group-header" (click)="toggleGroup(group.name)">
            <span class="cl-group-arrow">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
            <span class="cl-group-name">{{ group.name }}</span>
            <span class="cl-group-progress">{{ groupProgress(group) }}</span>
          </div>
          @if (isGroupOpen(group.name)) {
            <div class="cl-items">
              @for (item of group.items; track item.key) {
                <label class="cl-item" [class.checked]="item.checked">
                  <input
                    type="checkbox"
                    class="wf-checkbox"
                    [checked]="item.checked"
                    (change)="onToggle(item.key)"
                  />
                  <span class="cl-item-name">{{ item.label }}</span>
                  @if (item.tag) {
                    <span class="section-tag" [class]="'tag-' + item.tag">{{ item.tag }}</span>
                  }
                </label>
              }
            </div>
          }
        </div>
      }

      @if (filteredGroups().length === 0) {
        <div class="cl-empty">No items match "{{ searchQuery }}"</div>
      }
    </div>
  `,
  styles: [`
    .cl-wrapper { }
    .cl-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .cl-search {
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
    .cl-search:focus {
      border-color: var(--color-gold);
    }
    .cl-stats {
      font-size: 13px;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .cl-done { color: var(--color-gold); font-weight: 600; }
    .cl-sep { margin: 0 2px; }
    .cl-btn {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .cl-btn:hover {
      border-color: var(--color-gold);
      color: var(--color-gold);
    }
    .cl-group {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .cl-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--color-surface2);
      cursor: pointer;
      user-select: none;
    }
    .cl-group-header:hover {
      background: #1e1e2c;
    }
    .cl-group-arrow { color: var(--color-gold); font-size: 12px; width: 12px; }
    .cl-group-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--color-text); letter-spacing: 0.03em; }
    .cl-group-progress { font-size: 11px; color: var(--color-text-muted); }
    .cl-items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1px;
      background: var(--color-border);
    }
    .cl-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 12px;
      background: var(--color-surface);
      cursor: pointer;
      transition: background 0.1s;
    }
    .cl-item:hover {
      background: var(--color-surface2);
    }
    .cl-item.checked .cl-item-name {
      color: var(--color-text-muted);
      text-decoration: line-through;
      text-decoration-color: var(--color-gold);
    }
    .cl-item-name {
      font-size: 12px;
      color: var(--color-text);
      flex: 1;
      line-height: 1.3;
    }
    .cl-empty {
      text-align: center;
      padding: 40px;
      color: var(--color-text-muted);
      font-size: 13px;
    }
  `]
})
export class ChecklistComponent implements OnChanges {
  @Input() groups: { name: string; items: { key: string; label: string; checked: boolean; tag?: string }[] }[] = [];
  @Output() toggle = new EventEmitter<string>();
  @Output() bulkChange = new EventEmitter<{ keys: string[]; value: boolean }>();

  searchQuery = '';
  private openGroups = signal<Set<string>>(new Set());
  private readonly _groups = signal<{ name: string; items: { key: string; label: string; checked: boolean; tag?: string }[] }[]>([]);

  readonly filteredGroups = computed(() => {
    const groups = this._groups();
    const q = this.searchQuery.toLowerCase();
    return groups.map(g => ({
      ...g,
      items: q ? g.items.filter(i => i.label.toLowerCase().includes(q)) : g.items
    })).filter(g => g.items.length > 0);
  });

  readonly filteredItems = computed(() => this.filteredGroups().flatMap(g => g.items));
  readonly checkedCount = computed(() => this.filteredItems().filter(i => i.checked).length);

  ngOnChanges(): void {
    this._groups.set(this.groups);
    if (this.openGroups().size === 0 && this.groups.length > 0) {
      this.openGroups.set(new Set([this.groups[0].name]));
    }
  }

  isGroupOpen(name: string): boolean {
    return this.openGroups().has(name);
  }

  toggleGroup(name: string): void {
    this.openGroups.update(set => {
      const next = new Set(set);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  groupProgress(group: { items: { checked: boolean }[] }): string {
    const done = group.items.filter(i => i.checked).length;
    return `${done}/${group.items.length}`;
  }

  onSearch(q: string): void {
    this.searchQuery = q;
    // Open all groups when searching
    if (q) {
      this.openGroups.set(new Set(this.groups.map(g => g.name)));
    }
  }

  onToggle(key: string): void {
    this.toggle.emit(key);
  }

  checkAll(): void {
    const keys = this.filteredItems().filter(i => !i.checked).map(i => i.key);
    this.bulkChange.emit({ keys, value: true });
  }

  uncheckAll(): void {
    const keys = this.filteredItems().filter(i => i.checked).map(i => i.key);
    this.bulkChange.emit({ keys, value: false });
  }
}
