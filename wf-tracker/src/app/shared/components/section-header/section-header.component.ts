import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-section-header',
  imports: [ProgressBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sh-wrapper">
      <div class="sh-title-row">
        <h1 class="sh-title">{{ title() }}</h1>
        @if (total() > 0) {
          <div class="sh-badge">
            <span class="sh-count">{{ completed() }}/{{ total() }}</span>
          </div>
        }
      </div>
      @if (description()) {
        <p class="sh-desc">{{ description() }}</p>
      }
      @if (total() > 0) {
        <app-progress-bar [label]="'Progress'" [completed]="completed()" [total]="total()" />
      }
    </div>
  `,
  styles: [`
    .sh-wrapper {
      padding: 28px 0 22px;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 24px;
    }
    .sh-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .sh-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0.03em;
      margin: 0;
    }
    .sh-badge {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 99px;
      padding: 2px 9px;
    }
    .sh-count {
      font-size: 11px;
      color: var(--color-text-dim);
      font-weight: 500;
    }
    .sh-desc {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: 0 0 14px;
      line-height: 1.6;
    }
  `]
})
export class SectionHeaderComponent {
  title = input('');
  description = input('');
  completed = input(0);
  total = input(0);
}
