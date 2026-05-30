import { Component, inject, signal, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SlicePipe } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { VersionLogEntry } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-version-log',
  imports: [SlicePipe, SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header title="VERSION LOG" description="History of changes to the Warframe Completion Tracker spreadsheet." />
      <div class="version-list">
        @for (entry of log(); track entry.version) {
          <div class="version-entry">
            <button
              type="button"
              class="version-header"
              (click)="toggle(entry.version)"
              [attr.aria-expanded]="isOpen(entry.version)"
            >
              <span class="version-date">{{ entry.date | slice:0:10 }}</span>
              <span class="version-tag">{{ entry.version }}</span>
              <span class="version-desc">{{ entry.description }}</span>
              <span class="version-arrow" aria-hidden="true">{{ isOpen(entry.version) ? '▾' : '▸' }}</span>
            </button>
            @if (isOpen(entry.version) && entry.details) {
              <div class="version-details">
                <pre>{{ entry.details }}</pre>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }
    .version-list { display: flex; flex-direction: column; gap: 6px; }
    .version-entry {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .version-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: var(--color-surface);
      cursor: pointer;
      width: 100%;
      text-align: left;
      border: none;
      font: inherit;
      color: inherit;
    }
    .version-header:hover { background: var(--color-surface2); }
    .version-date { font-size: 11px; color: var(--color-text-muted); min-width: 80px; }
    .version-tag {
      font-size: 11px;
      font-weight: 700;
      color: var(--color-gold);
      min-width: 100px;
      padding: 2px 6px;
      background: var(--color-surface2);
      border-radius: 3px;
      border: 1px solid var(--color-border);
    }
    .version-desc { flex: 1; font-size: 13px; color: var(--color-text); }
    .version-arrow { color: var(--color-gold); }
    .version-details {
      background: var(--color-surface2);
      border-top: 1px solid var(--color-border);
      padding: 12px 16px;
    }
    .version-details pre {
      font-size: 12px;
      color: var(--color-text-muted);
      white-space: pre-wrap;
      margin: 0;
      font-family: inherit;
      line-height: 1.6;
    }
  `]
})
export class VersionLogComponent {
  private readonly dataService = inject(DataService);
  private readonly rawData = toSignal(this.dataService.getData());
  private openEntries = signal<Set<string>>(new Set());

  readonly log = computed<VersionLogEntry[]>(() => {
    const d = this.rawData();
    if (!d?.versionLog) return [];
    return [...d.versionLog].reverse();
  });

  constructor() {
    effect(() => {
      const entries = this.log();
      if (entries.length > 0 && this.openEntries().size === 0) {
        this.openEntries.set(new Set([entries[0].version]));
      }
    });
  }

  isOpen(version: string): boolean {
    return this.openEntries().has(version);
  }

  toggle(version: string): void {
    this.openEntries.update(s => {
      const next = new Set(s);
      if (next.has(version)) next.delete(version); else next.add(version);
      return next;
    });
  }
}
