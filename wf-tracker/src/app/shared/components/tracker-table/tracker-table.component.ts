import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';

export interface TrackerColumn {
  key: string;
  label: string;
}

export interface TrackerRow {
  name: string;
  tags?: { label: string; cssClass: string }[];
  subtitle?: string;
  rowCssClass?: string;
  group?: string;
}

@Component({
  selector: 'app-tracker-table',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tt-wrapper">
      <table class="tt-table">
        <thead>
          <tr>
            <th class="tt-col-name">Name</th>
            @for (col of columns(); track col.key; let ci = $index) {
              <th class="tt-col-check" [class.tt-col-alt]="ci % 2 === 1">
                <button
                  type="button"
                  class="tt-col-toggle"
                  [class.tt-col-full]="isColumnFull(col.key)"
                  [attr.aria-pressed]="isColumnFull(col.key)"
                  [attr.aria-label]="'Toggle all ' + col.label"
                  (click)="toggleColumn(col.key)"
                >
                  {{ col.label }}
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.name; let i = $index) {
            @if (row.group && (i === 0 || rows()[i - 1].group !== row.group)) {
              <tr class="tt-group-row" aria-hidden="true">
                <td [attr.colspan]="columns().length + 1" class="tt-group-cell">{{ row.group }}</td>
              </tr>
            }
            <tr [class]="row.rowCssClass || ''" [class.tt-row-has-note]="hasNote(row.name)">
              <td class="tt-col-name">
                <span class="tt-name-cell">
                  <span class="tt-name-text">
                    <span class="tt-primary-name">
                      {{ row.name }}
                      @for (tag of row.tags || []; track tag.label) {
                        <span class="tt-tag" [class]="tag.cssClass">{{ tag.label }}</span>
                      }
                    </span>
                    @if (row.subtitle) {
                      <span class="tt-subtitle">{{ row.subtitle }}</span>
                    }
                  </span>
                  @if (notesFn()) {
                    <button
                      type="button"
                      class="tt-note-btn"
                      [class.tt-note-btn-active]="isNoteOpen(row.name)"
                      [attr.aria-expanded]="isNoteOpen(row.name)"
                      [attr.aria-label]="(isNoteOpen(row.name) ? 'Hide' : 'Show') + ' note for ' + row.name"
                      (click)="toggleNote(row.name)"
                    >✎</button>
                  }
                </span>
              </td>
              @for (col of columns(); track col.key; let ci = $index) {
                <td class="tt-col-check" [class.tt-col-alt]="ci % 2 === 1">
                  @if (isCellDisabled(row.name, col.key)) {
                    <span class="tt-cell-disabled" aria-hidden="true">—</span>
                  } @else {
                    <input
                      type="checkbox"
                      class="wf-checkbox"
                      [checked]="isChecked(row.name, col.key)"
                      (change)="toggle.emit({ rowName: row.name, colKey: col.key })"
                      [attr.aria-label]="row.name + ' - ' + col.label"
                    />
                  }
                </td>
              }
            </tr>
            @if (notesFn() && isNoteOpen(row.name)) {
              <tr class="tt-note-row">
                <td [attr.colspan]="columns().length + 1" class="tt-note-cell">
                  <textarea
                    class="tt-note-textarea"
                    rows="3"
                    [attr.aria-label]="'Notes for ' + row.name"
                    [value]="getNote(row.name)"
                    (input)="onNoteInput(row.name, $event)"
                    placeholder="Add a note…"
                  ></textarea>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .tt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .tt-table th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #16161f;
      padding: 6px 10px;
      text-align: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      border-bottom: 2px solid var(--color-gold);
      white-space: nowrap;
    }
    .tt-table th.tt-col-name { text-align: left; }
    .tt-table th.tt-col-alt { background: #0a0a14; }
    .tt-col-toggle {
      width: 100%;
      background: none;
      border: none;
      font: inherit;
      color: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 3px;
    }
    .tt-col-toggle:hover { color: var(--color-gold); }
    .tt-col-toggle:focus-visible {
      outline: 2px solid var(--color-gold);
      outline-offset: 1px;
    }
    .tt-col-toggle.tt-col-full { color: var(--color-gold); }
    .tt-table td {
      padding: 5px 10px;
      border-bottom: 1px solid var(--color-border);
      text-align: center;
    }
    .tt-table td.tt-col-name {
      text-align: left;
      color: var(--color-text);
      white-space: nowrap;
    }
    .tt-table td.tt-col-alt {
      background: rgba(255,255,255,0.04);
    }
    .tt-table tr:hover td { background: var(--color-surface2) !important; }
    .tt-group-cell {
      padding: 5px 10px 3px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-gold);
      background: var(--color-surface2) !important;
      border-bottom: none;
    }
    .tt-group-row + tr td { border-top: none; }
    .tt-cell-disabled { color: var(--color-border); font-size: 11px; }
    .tt-tag {
      display: inline-block;
      margin-left: 6px;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .tt-name-cell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .tt-name-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .tt-primary-name { white-space: nowrap; }
    .tt-subtitle {
      font-size: 10px;
      color: var(--color-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }
    .tt-note-btn {
      flex-shrink: 0;
      background: none;
      border: 1px solid transparent;
      color: var(--color-text-muted);
      font-size: 13px;
      line-height: 1;
      padding: 1px 4px;
      border-radius: 3px;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.15s, color 0.15s;
    }
    .tt-note-btn:hover { opacity: 1; color: var(--color-gold); }
    .tt-note-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 1px; }
    .tt-note-btn-active { opacity: 1; color: var(--color-gold); }
    .tt-row-has-note td { background: rgba(200, 155, 60, 0.06) !important; }
    .tt-row-has-note td.tt-col-alt { background: rgba(200, 155, 60, 0.10) !important; }
    .tt-note-row td { padding: 0 10px 8px; border-bottom: 1px solid var(--color-border); }
    .tt-note-textarea {
      width: 100%;
      max-width: 520px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      color: var(--color-text);
      font-size: 12px;
      padding: 6px 8px;
      resize: vertical;
      font-family: inherit;
      box-sizing: border-box;
    }
    .tt-note-textarea:focus { outline: none; border-color: var(--color-gold); }
  `]
})
export class TrackerTableComponent {
  columns = input<TrackerColumn[]>([]);
  rows = input<TrackerRow[]>([]);
  checkedFn = input<((rowName: string, colKey: string) => boolean) | null>(null);
  disabledCellFn = input<((rowName: string, colKey: string) => boolean) | null>(null);
  notesFn = input<((rowName: string) => string) | null>(null);
  setNoteFn = input<((rowName: string, value: string) => void) | null>(null);
  toggle = output<{ rowName: string; colKey: string }>();

  private readonly openNotes = signal<Set<string>>(new Set());

  hasNote(rowName: string): boolean {
    return !!this.notesFn()?.(rowName);
  }

  isNoteOpen(rowName: string): boolean {
    return this.openNotes().has(rowName);
  }

  toggleNote(rowName: string): void {
    this.openNotes.update(s => {
      const next = new Set(s);
      if (next.has(rowName)) next.delete(rowName); else next.add(rowName);
      return next;
    });
  }

  getNote(rowName: string): string {
    return this.notesFn()?.(rowName) ?? '';
  }

  onNoteInput(rowName: string, event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.setNoteFn()?.(rowName, value);
  }

  isChecked(rowName: string, colKey: string): boolean {
    const fn = this.checkedFn();
    return fn ? fn(rowName, colKey) : false;
  }

  isCellDisabled(rowName: string, colKey: string): boolean {
    const fn = this.disabledCellFn();
    return fn ? fn(rowName, colKey) : false;
  }

  /** True when every row in the column is already checked. */
  isColumnFull(colKey: string): boolean {
    const rows = this.rows();
    return rows.length > 0 && rows.every(row => this.isChecked(row.name, colKey));
  }

  /**
   * Smart-toggles a whole column: if every cell is already checked it clears the
   * column, otherwise it fills the remaining cells. Reuses the per-cell `toggle`
   * output so every page using this table gets the behaviour for free.
   */
  toggleColumn(colKey: string): void {
    const rows = this.rows();
    if (rows.length === 0) return;
    const clearing = this.isColumnFull(colKey);
    for (const row of rows) {
      if (this.isCellDisabled(row.name, colKey)) continue;
      if (clearing || !this.isChecked(row.name, colKey)) {
        this.toggle.emit({ rowName: row.name, colKey });
      }
    }
  }
}
