import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressBarComponent } from '../progress-bar/progress-bar.component';

@Component({
  selector: 'app-section-header',
  standalone: true,
  imports: [CommonModule, ProgressBarComponent],
  template: `
    <div class="sh-wrapper">
      <div class="sh-title-row">
        <h1 class="sh-title">{{ title }}</h1>
        <div class="sh-badge" *ngIf="total > 0">
          <span class="sh-count">{{ completed }}/{{ total }}</span>
        </div>
      </div>
      <p class="sh-desc" *ngIf="description">{{ description }}</p>
      <app-progress-bar *ngIf="total > 0" [label]="'Progress'" [completed]="completed" [total]="total" />
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
  @Input() title = '';
  @Input() description = '';
  @Input() completed = 0;
  @Input() total = 0;
}
