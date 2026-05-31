import { Component, input, output, signal, computed, effect, inject, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PaletteService } from '../../../core/services/palette.service';

@Component({
  selector: 'app-checklist',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cl-wrapper">
      <div class="cl-controls">
        <input
          class="cl-search"
          type="text"
          placeholder="Search..."
          aria-label="Search"
          [formControl]="searchControl"
        />
        <div class="cl-stats">
          <span class="cl-done">{{ checkedCount() }}</span>
          <span class="cl-sep">/</span>
          <span class="cl-total">{{ filteredItems().length }}</span>
        </div>
        <button type="button" class="cl-btn" (click)="checkAll()" title="Check all visible">✓ All</button>
        <button type="button" class="cl-btn" (click)="uncheckAll()" title="Uncheck all visible">✗ None</button>
      </div>

      @for (group of filteredGroups(); track group.name) {
        <div class="cl-group">
          <button
            type="button"
            class="cl-group-header"
            (click)="toggleGroup(group.name)"
            [attr.aria-expanded]="isGroupOpen(group.name)"
          >
            <span class="cl-group-arrow" aria-hidden="true">{{ isGroupOpen(group.name) ? '▾' : '▸' }}</span>
            <span class="cl-group-name">{{ group.name }}</span>
            <span class="cl-group-progress">{{ groupProgress(group) }}</span>
          </button>
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
        <div class="cl-empty">No items match "{{ searchQuery() }}"</div>
      }
    </div>
  `,
  styles: [`
    .cl-wrapper { }
    .cl-controls {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }
    .cl-search {
      flex: 1;
      min-width: 180px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 6px 11px;
      border-radius: 6px;
      font-size: 13px;
      outline: none;
      transition: border-color var(--transition-fast);
    }
    .cl-search:focus {
      border-color: var(--color-accent);
    }
    .cl-search:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .cl-stats {
      font-size: 12px;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .cl-done { color: var(--color-accent-light); font-weight: 600; }
    .cl-sep { margin: 0 2px; color: var(--color-text-muted); }
    .cl-btn {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      padding: 5px 11px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast);
    }
    .cl-btn:hover {
      border-color: var(--color-accent);
      color: var(--color-accent-light);
    }
    .cl-btn:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .cl-group {
      border: 1px solid var(--color-border);
      border-radius: 8px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .cl-group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 13px;
      background: var(--color-surface2);
      cursor: pointer;
      user-select: none;
      width: 100%;
      text-align: left;
      border: none;
      font: inherit;
      color: inherit;
      transition: background var(--transition-fast);
    }
    .cl-group-header:hover {
      background: var(--color-surface3);
    }
    .cl-group-header:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: -2px;
    }
    .cl-group-arrow { color: var(--color-accent); font-size: 11px; width: 12px; opacity: 0.8; }
    .cl-group-name { flex: 1; font-size: 12.5px; font-weight: 600; color: var(--color-text); letter-spacing: 0.02em; }
    .cl-group-progress { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
    .cl-items {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 1px;
      background: var(--color-border);
    }
    .cl-item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 7px 13px;
      background: var(--color-surface);
      cursor: pointer;
      transition: background var(--transition-fast);
    }
    .cl-item:hover {
      background: var(--color-surface2);
    }
    .cl-item.checked .cl-item-name {
      color: var(--color-text-muted);
      text-decoration: line-through;
      text-decoration-color: var(--color-accent);
      text-decoration-thickness: 1px;
    }
    .cl-item-name {
      font-size: 12px;
      color: var(--color-text);
      flex: 1;
      line-height: 1.4;
    }
    .cl-empty {
      text-align: center;
      padding: 48px;
      color: var(--color-text-muted);
      font-size: 13px;
    }
  `]
})
export class ChecklistComponent {
  groups = input<{ name: string; items: { key: string; label: string; checked: boolean; tag?: string }[] }[]>([]);
  toggle = output<string>();
  bulkChange = output<{ keys: string[]; value: boolean }>();

  private readonly paletteService = inject(PaletteService);
  readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private openGroups = signal<Set<string>>(new Set());

  readonly filteredGroups = computed(() => {
    const groups = this.groups();
    const q = this.searchQuery().toLowerCase();
    return groups.map(g => ({
      ...g,
      items: q ? g.items.filter(i => i.label.toLowerCase().includes(q)) : g.items
    })).filter(g => g.items.length > 0);
  });

  readonly filteredItems = computed(() => this.filteredGroups().flatMap(g => g.items));
  readonly checkedCount = computed(() => this.filteredItems().filter(i => i.checked).length);

  constructor() {
    effect(() => {
      const groups = this.groups();
      if (groups.length > 0 && this.openGroups().size === 0) {
        this.openGroups.set(new Set([groups[0].name]));
      }
    });
    effect(() => {
      if (this.searchQuery()) {
        this.openGroups.set(new Set(this.groups().map(g => g.name)));
      }
    });

    afterNextRender(() => {
      const q = this.paletteService.consumePendingSearch();
      if (q) this.searchControl.setValue(q);
    });
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
