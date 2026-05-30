import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-progress-bar',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pb-wrapper">
      <div class="pb-header">
        <span class="pb-label">{{ label() }}</span>
        <span class="pb-value">{{ completed() }}/{{ total() }} <span class="pb-pct">({{ pct().toFixed(1) }}%)</span></span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" [style.width.%]="pct()"></div>
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
  label = input('');
  completed = input(0);
  total = input(0);
  readonly pct = computed(() => this.total() > 0 ? (this.completed() / this.total()) * 100 : 0);
}
