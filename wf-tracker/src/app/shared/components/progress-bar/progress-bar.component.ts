import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-progress-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pb-wrapper">
      <div class="pb-header">
        <span class="pb-label">{{ label }}</span>
        <span class="pb-value">{{ completed }}/{{ total }} <span class="pb-pct">({{ pct.toFixed(1) }}%)</span></span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" [style.width.%]="pct"></div>
      </div>
    </div>
  `,
  styles: [`
    .pb-wrapper { margin-bottom: 4px; }
    .pb-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .pb-label { font-size: 13px; color: var(--color-text); }
    .pb-value { font-size: 12px; color: var(--color-gold); font-weight: 600; }
    .pb-pct { color: var(--color-text-muted); font-weight: 400; }
  `]
})
export class ProgressBarComponent {
  @Input() label = '';
  @Input() completed = 0;
  @Input() total = 0;
  get pct(): number { return this.total > 0 ? (this.completed / this.total) * 100 : 0; }
}
