import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';

export interface TrackerColumn {
  key: string;
  label: string;
}

export interface TrackerRow {
  name: string;
  tags?: { label: string; cssClass: string }[];
  rowCssClass?: string;
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
              <th class="tt-col-check" [class.tt-col-alt]="ci % 2 === 1">{{ col.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.name) {
            <tr [class]="row.rowCssClass || ''">
              <td class="tt-col-name">
                {{ row.name }}
                @for (tag of row.tags || []; track tag.label) {
                  <span class="tt-tag" [class]="tag.cssClass">{{ tag.label }}</span>
                }
              </td>
              @for (col of columns(); track col.key; let ci = $index) {
                <td class="tt-col-check" [class.tt-col-alt]="ci % 2 === 1">
                  <input
                    type="checkbox"
                    class="wf-checkbox"
                    [checked]="isChecked(row.name, col.key)"
                    (change)="toggle.emit({ rowName: row.name, colKey: col.key })"
                    [attr.aria-label]="row.name + ' - ' + col.label"
                  />
                </td>
              }
            </tr>
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
  `]
})
export class TrackerTableComponent {
  columns = input<TrackerColumn[]>([]);
  rows = input<TrackerRow[]>([]);
  checkedFn = input<((rowName: string, colKey: string) => boolean) | null>(null);
  toggle = output<{ rowName: string; colKey: string }>();

  isChecked(rowName: string, colKey: string): boolean {
    const fn = this.checkedFn();
    return fn ? fn(rowName, colKey) : false;
  }
}
