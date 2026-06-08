import { Component, input, output, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { TrackerService } from '../../../core/services/tracker.service';

export interface TrackerColumn {
  key: string;
  label: string;
  icon?: string;
}

export interface TrackerCellSub {
  /** Identity suffix for this sub-checkbox (e.g. the variant name). */
  key: string;
  /** Short label shown next to the checkbox (e.g. "Base", "Prime", "Kuva"). */
  label: string;
  /** Render the label in the founder colour. */
  founder?: boolean;
}

export interface TrackerRow {
  name: string;
  tags?: { label: string; cssClass: string }[];
  subtitle?: string;
  rowCssClass?: string;
  group?: string;
  /**
   * Per-column override: render multiple labelled checkboxes in a single cell
   * instead of one. Keyed by column key. Each sub-checkbox is addressed by
   * `(row.name, colKey, sub.key)`.
   */
  multiCells?: Record<string, TrackerCellSub[]>;
}

@Component({
  selector: 'app-tracker-table',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tt-wrapper">
      <div class="tt-controls">
        <button
          type="button"
          class="tt-pill-btn"
          [class.active]="sortIncompleteFirst()"
          [attr.aria-pressed]="sortIncompleteFirst()"
          (click)="sortIncompleteFirst.update(v => !v)"
        >Incomplete First</button>
        <button
          type="button"
          class="tt-pill-btn"
          [class.active]="hideComplete()"
          [attr.aria-pressed]="hideComplete()"
          (click)="hideComplete.update(v => !v)"
        >{{ hideComplete() ? 'Show All' : 'Hide Complete' }}</button>
      </div>
      <table class="tt-table">
        <thead>
          <tr>
            <th class="tt-col-name">Name</th>
            @for (col of columns(); track col.key; let ci = $index) {
              <th
                class="tt-col-check"
                [class.tt-col-alt]="ci % 2 === 1"
                [class.tt-col-icon]="!!col.icon"
              >
                <button
                  type="button"
                  class="tt-col-toggle"
                  [class.tt-col-full]="isColumnFull(col.key)"
                  [attr.aria-pressed]="isColumnFull(col.key)"
                  [attr.aria-label]="'Toggle all ' + col.label"
                  [title]="col.label"
                  (click)="toggleColumn(col.key)"
                >
                  @if (col.icon) {
                    <span aria-hidden="true">{{ col.icon }}</span>
                  } @else {
                    {{ col.label }}
                  }
                </button>
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of displayRows(); track row.name; let i = $index) {
            @if (row.group && (i === 0 || displayRows()[i - 1].group !== row.group)) {
              <tr class="tt-group-row" aria-hidden="true">
                <td [attr.colspan]="columns().length + 1" class="tt-group-cell">{{ row.group }}</td>
              </tr>
            }
            <tr
              [class]="row.rowCssClass || ''"
              [class.tt-row-has-note]="hasNote(row.name)"
              [class.tt-row-complete]="isRowFull(row.name)"
            >
              <td class="tt-col-name">
                <span class="tt-name-cell">
                  <span class="tt-name-text">
                    <button
                      type="button"
                      class="tt-primary-name tt-name-btn"
                      [class.tt-name-full]="isRowFull(row.name)"
                      [attr.aria-pressed]="isRowFull(row.name)"
                      [attr.aria-label]="'Toggle all checkboxes for ' + row.name"
                      (click)="toggleRow(row.name)"
                    >
                      {{ row.name }}
                      @for (tag of row.tags || []; track tag.label) {
                        <span class="tt-tag" [class]="tag.cssClass">{{ tag.label }}</span>
                      }
                    </button>
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
                  @if (showWikiLinks()) {
                    <a
                      class="tt-wiki-btn"
                      [href]="wikiUrl(row.name)"
                      target="_blank"
                      rel="noopener noreferrer"
                      [attr.aria-label]="'Open wiki page for ' + row.name"
                      title="Open wiki page"
                    >W</a>
                  }
                </span>
              </td>
              @for (col of columns(); track col.key; let ci = $index) {
                <td class="tt-col-check" [class.tt-col-alt]="ci % 2 === 1">
                  @if (subCellsFor(row, col.key); as subs) {
                    <span class="tt-multi">
                      @for (sub of subs; track sub.key) {
                        <label class="tt-multi-item" [class.tt-multi-founder]="sub.founder">
                          <input
                            type="checkbox"
                            class="wf-checkbox"
                            [checked]="isChecked(row.name, col.key, sub.key)"
                            (change)="toggle.emit({ rowName: row.name, colKey: col.key, subKey: sub.key })"
                            [attr.aria-label]="row.name + ' ' + sub.label + ' - ' + col.label"
                          />
                          <span class="tt-multi-label">{{ sub.label }}</span>
                        </label>
                      }
                    </span>
                  } @else if (isCellDisabled(row.name, col.key)) {
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
    .tt-wrapper {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .tt-controls {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
      margin-bottom: 8px;
    }
    .tt-pill-btn {
      padding: 3px 10px;
      border-radius: 99px;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid var(--color-border);
      background: var(--color-surface2);
      color: var(--color-text-muted);
      cursor: pointer;
      transition: color 0.15s, border-color 0.15s, background 0.15s;
    }
    .tt-pill-btn:hover { color: var(--color-text); border-color: var(--color-text-muted); }
    .tt-pill-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }
    .tt-pill-btn.active { border-color: var(--color-gold); color: var(--color-gold); background: rgba(200,155,60,0.10); }
    .tt-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .tt-table th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--color-surface2);
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
    .tt-table th.tt-col-alt { background: var(--color-bg); }
    .tt-col-icon { min-width: 36px; width: 36px; }
    .tt-col-icon .tt-col-toggle { font-size: 14px; padding: 2px; }
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
    .tt-multi {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: flex-start;
      gap: 3px 10px;
    }
    .tt-multi-item {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      font-size: 10px;
      color: var(--color-text-muted);
    }
    .tt-multi-item:hover { color: var(--color-text); }
    .tt-multi-label { user-select: none; white-space: nowrap; }
    .tt-multi-founder .tt-multi-label { color: #ff9a3c; }
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
    .tt-tag-founder { color: #ff9a3c; }
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
    .tt-name-btn {
      background: none;
      border: none;
      font: inherit;
      color: inherit;
      padding: 0;
      text-align: left;
      cursor: pointer;
      border-radius: 3px;
    }
    .tt-name-btn:hover { color: var(--color-gold); }
    .tt-name-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 1px; }
    .tt-name-btn.tt-name-full { color: var(--color-gold); }
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
    .tt-wiki-btn {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      background: rgba(200,155,60,0.12);
      color: var(--color-text-muted);
      border: 1px solid var(--color-border);
      opacity: 0.5;
      transition: opacity 0.15s, color 0.15s, border-color 0.15s;
    }
    .tt-wiki-btn:hover { opacity: 1; color: var(--color-gold); border-color: var(--color-gold); }
    .tt-wiki-btn:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 1px; }
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
    .tt-row-complete td { opacity: 0.45; }
    .tt-row-complete .tt-primary-name { text-decoration: line-through; color: var(--color-text-muted); }
    .tt-row-complete:hover td { opacity: 0.6; }
  `]
})
export class TrackerTableComponent {
  private readonly tracker = inject(TrackerService);

  readonly showWikiLinks = computed(() => this.tracker.settings().showWikiLinks);

  wikiUrl(name: string): string {
    return `https://wiki.warframe.com/w/${encodeURIComponent(name.replace(/ /g, '_'))}`;
  }

  columns = input<TrackerColumn[]>([]);
  rows = input<TrackerRow[]>([]);
  checkedFn = input<((rowName: string, colKey: string, subKey?: string) => boolean) | null>(null);
  disabledCellFn = input<((rowName: string, colKey: string) => boolean) | null>(null);
  notesFn = input<((rowName: string) => string) | null>(null);
  setNoteFn = input<((rowName: string, value: string) => void) | null>(null);
  toggle = output<{ rowName: string; colKey: string; subKey?: string }>();

  readonly hideComplete = signal(false);
  readonly sortIncompleteFirst = signal(false);

  readonly displayRows = computed(() => {
    let rows = this.rows();
    if (this.sortIncompleteFirst()) {
      const incomplete: TrackerRow[] = [];
      const complete: TrackerRow[] = [];
      for (const r of rows) {
        (this.isRowFull(r.name) ? complete : incomplete).push(r);
      }
      rows = [...incomplete, ...complete];
    }
    if (this.hideComplete()) {
      rows = rows.filter(r => !this.isRowFull(r.name));
    }
    return rows;
  });

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

  /** The multi-checkbox sub-cells for a given cell, or null for a normal cell. */
  subCellsFor(row: TrackerRow, colKey: string): TrackerCellSub[] | null {
    return row.multiCells?.[colKey] ?? null;
  }

  isChecked(rowName: string, colKey: string, subKey?: string): boolean {
    const fn = this.checkedFn();
    return fn ? fn(rowName, colKey, subKey) : false;
  }

  isCellDisabled(rowName: string, colKey: string): boolean {
    const fn = this.disabledCellFn();
    return fn ? fn(rowName, colKey) : false;
  }

  /** Toggleable checkbox units in a row (one per normal cell, one per sub-cell). */
  private rowUnits(rowName: string): { colKey: string; subKey?: string }[] {
    const row = this.rows().find(r => r.name === rowName);
    const units: { colKey: string; subKey?: string }[] = [];
    for (const col of this.columns()) {
      const subs = row?.multiCells?.[col.key];
      if (subs) {
        for (const sub of subs) units.push({ colKey: col.key, subKey: sub.key });
      } else if (!this.isCellDisabled(rowName, col.key)) {
        units.push({ colKey: col.key });
      }
    }
    return units;
  }

  /** Toggleable checkbox units in a column across all rows. */
  private columnUnits(colKey: string): { rowName: string; subKey?: string }[] {
    const units: { rowName: string; subKey?: string }[] = [];
    for (const row of this.rows()) {
      const subs = row.multiCells?.[colKey];
      if (subs) {
        for (const sub of subs) units.push({ rowName: row.name, subKey: sub.key });
      } else if (!this.isCellDisabled(row.name, colKey)) {
        units.push({ rowName: row.name });
      }
    }
    return units;
  }

  /** True when every checkbox in the row is already checked. */
  isRowFull(rowName: string): boolean {
    const units = this.rowUnits(rowName);
    return units.length > 0 && units.every(u => this.isChecked(rowName, u.colKey, u.subKey));
  }

  /**
   * Smart-toggles a whole row: if every checkbox is already checked it clears the
   * row, otherwise it fills the remaining ones. Reuses the per-cell `toggle`
   * output so every page using this table gets the behaviour for free.
   */
  toggleRow(rowName: string): void {
    const clearing = this.isRowFull(rowName);
    for (const u of this.rowUnits(rowName)) {
      if (clearing || !this.isChecked(rowName, u.colKey, u.subKey)) {
        this.toggle.emit({ rowName, colKey: u.colKey, subKey: u.subKey });
      }
    }
  }

  /** True when every checkbox in the column is already checked. */
  isColumnFull(colKey: string): boolean {
    const units = this.columnUnits(colKey);
    return units.length > 0 && units.every(u => this.isChecked(u.rowName, colKey, u.subKey));
  }

  /**
   * Smart-toggles a whole column: if every checkbox is already checked it clears
   * the column, otherwise it fills the remaining ones.
   */
  toggleColumn(colKey: string): void {
    const units = this.columnUnits(colKey);
    if (units.length === 0) return;
    const clearing = this.isColumnFull(colKey);
    for (const u of units) {
      if (clearing || !this.isChecked(u.rowName, colKey, u.subKey)) {
        this.toggle.emit({ rowName: u.rowName, colKey, subKey: u.subKey });
      }
    }
  }
}
