import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { WorldStateService, CycleState } from '../../../core/services/world-state.service';

interface CycleDisplay {
  label: string;
  phase: string;
  phaseClass: string;
  timeLeft: string;
  pct: number;
  totalDuration: number;
}

@Component({
  selector: 'app-world-state-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ws-panel" aria-label="World State — open-world cycles">
      <div class="ws-header">
        <span class="ws-title">WORLD STATE</span>
        <button
          class="ws-refresh"
          (click)="refresh()"
          [attr.aria-label]="'Refresh world state'"
          [disabled]="service.loading()"
        >
          <span [class.spinning]="service.loading()" aria-hidden="true">⟳</span>
        </button>
      </div>

      @if (service.error()) {
        <p class="ws-error" role="alert">Failed to load world state. <button (click)="refresh()">Retry</button></p>
      } @else if (service.loading() && !cycles().length) {
        <div class="ws-loading" aria-busy="true">Loading…</div>
      } @else {
        <div class="ws-cycles">
          @for (cycle of cycles(); track cycle.label) {
            <div class="ws-cycle" [attr.aria-label]="cycle.label + ': ' + cycle.phase + ', ' + cycle.timeLeft + ' remaining'">
              <div class="ws-cycle-top">
                <span class="ws-cycle-label">{{ cycle.label }}</span>
                <span class="ws-cycle-phase" [class]="cycle.phaseClass">{{ cycle.phase }}</span>
              </div>
              <div class="ws-bar-wrap" role="progressbar" [attr.aria-valuenow]="cycle.pct" aria-valuemin="0" aria-valuemax="100">
                <div class="ws-bar-track">
                  <div class="ws-bar-fill" [class]="cycle.phaseClass" [style.width.%]="cycle.pct"></div>
                </div>
              </div>
              <div class="ws-time">{{ cycle.timeLeft }}</div>
            </div>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .ws-panel {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 14px 16px 14px;
      margin-bottom: 24px;
    }
    .ws-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }
    .ws-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      color: var(--color-text-muted);
      text-transform: uppercase;
    }
    .ws-refresh {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 16px;
      padding: 2px 4px;
      border-radius: 4px;
      line-height: 1;
      transition: color var(--transition-fast);
    }
    .ws-refresh:hover:not([disabled]) { color: var(--color-accent-light); }
    .ws-refresh[disabled] { cursor: default; opacity: 0.5; }
    .ws-refresh:focus-visible { outline: 2px solid var(--color-accent-light); outline-offset: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinning { display: inline-block; animation: spin 0.8s linear infinite; }
    .ws-cycles {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
    }
    .ws-cycle { display: flex; flex-direction: column; gap: 5px; }
    .ws-cycle-top {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .ws-cycle-label {
      font-size: 10px;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .ws-cycle-phase {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .phase-day    { color: #d4a840; }
    .phase-night  { color: #6a9fc0; }
    .phase-warm   { color: #c8624a; }
    .phase-cold   { color: #6898b8; }
    .phase-fass   { color: #c85830; }
    .phase-vome   { color: #8870b0; }
    .ws-bar-track {
      height: 3px;
      background: var(--color-surface3);
      border-radius: 99px;
      overflow: hidden;
    }
    .ws-bar-fill {
      height: 100%;
      border-radius: 99px;
      transition: width 1s linear;
    }
    .ws-bar-fill.phase-day   { background: #d4a840; }
    .ws-bar-fill.phase-night { background: #6a9fc0; }
    .ws-bar-fill.phase-warm  { background: #c8624a; }
    .ws-bar-fill.phase-cold  { background: #6898b8; }
    .ws-bar-fill.phase-fass  { background: #c85830; }
    .ws-bar-fill.phase-vome  { background: #8870b0; }
    .ws-time {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
      font-variant-numeric: tabular-nums;
    }
    .ws-error {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: 4px 0;
    }
    .ws-error button {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-accent-light);
      font-size: 12px;
      padding: 0;
      text-decoration: underline;
    }
    .ws-loading {
      font-size: 12px;
      color: var(--color-text-muted);
      padding: 4px 0;
    }
  `],
})
export class WorldStatePanelComponent implements OnInit, OnDestroy {
  readonly service = inject(WorldStateService);

  private readonly now = signal(Date.now());
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // tick every second for countdown display
    this.tickInterval = setInterval(() => this.now.set(Date.now()), 1000);
    // reload API data every 60 seconds
    this.refreshInterval = setInterval(() => this.service.load(), 60_000);
  }

  ngOnDestroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  refresh(): void {
    this.service.load();
  }

  readonly cycles = computed<CycleDisplay[]>(() => {
    const ws = this.service.data();
    const now = this.now();
    if (!ws) return [];

    const defs: Array<[string, CycleState | undefined, Record<string, [string, string]>]> = [
      ['Cetus', ws.cetusCycle, { true: ['Day', 'phase-day'], false: ['Night', 'phase-night'] }],
      ['Orb Vallis', ws.vallisCycle, { warm: ['Warm', 'phase-warm'], cold: ['Cold', 'phase-cold'], true: ['Warm', 'phase-warm'], false: ['Cold', 'phase-cold'] }],
      ['Cambion Drift', ws.cambionCycle, { fass: ['Fass', 'phase-fass'], vome: ['Vome', 'phase-vome'], true: ['Fass', 'phase-fass'], false: ['Vome', 'phase-vome'] }],
      ['Earth', ws.earthCycle, { true: ['Day', 'phase-day'], false: ['Night', 'phase-night'] }],
    ];
    return defs
      .filter((d): d is [string, CycleState, Record<string, [string, string]>] => !!d[1])
      .map(([label, cycle, map]) => this.buildCycle(label, cycle, now, map));
  });

  private buildCycle(
    label: string,
    cycle: CycleState,
    now: number,
    phaseMap: Record<string, [string, string]>
  ): CycleDisplay {
    const expiry = new Date(cycle.expiry).getTime();
    const activation = new Date(cycle.activation).getTime();
    const remaining = Math.max(0, expiry - now);
    const total = expiry - activation;
    const elapsed = now - activation;
    const pct = total > 0 ? Math.min(100, (elapsed / total) * 100) : 0;

    const stateKey = cycle.state ?? String(cycle.isDay);
    const [phase, phaseClass] = phaseMap[stateKey] ?? phaseMap[String(cycle.isDay)] ?? ['Unknown', 'phase-day'];

    return { label, phase, phaseClass, timeLeft: this.formatMs(remaining), pct, totalDuration: total };
  }

  private formatMs(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  }
}
