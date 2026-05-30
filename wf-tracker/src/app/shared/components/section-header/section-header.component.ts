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
      padding: 24px 0 20px;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 20px;
    }
    .sh-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 4px;
    }
    .sh-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-gold);
      letter-spacing: 0.05em;
      margin: 0;
    }
    .sh-badge {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 2px 8px;
    }
    .sh-count {
      font-size: 12px;
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .sh-desc {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: 0 0 12px;
      line-height: 1.5;
    }
  `]
})
export class SectionHeaderComponent {
  title = input('');
  description = input('');
  completed = input(0);
  total = input(0);
}
