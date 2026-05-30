import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { TrackerData, IncarnonEntry } from '../../core/models/tracker.models';

interface SectionCard {
  label: string;
  route: string;
  icon: string;
  completed: number;
  total: number;
  enabled: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="dashboard-header">
        <div class="dashboard-title-block">
          <h1 class="dashboard-title">WARFRAME COMPLETIONIST</h1>
          <p class="dashboard-subtitle">All-in-One Tracker</p>
        </div>
        <div class="dashboard-overall">
          <div class="overall-pct">{{ overallPct().toFixed(2) }}%</div>
          <div class="overall-label">Overall Completion</div>
          <div class="rank-badge">{{ rankName() }}</div>
        </div>
      </div>

      <div class="overall-bar">
        <div class="progress-bar-bg" style="height: 10px">
          <div class="progress-bar-fill" [style.width.%]="overallPct()"></div>
        </div>
      </div>

      <div class="cards-grid">
        @for (card of cards(); track card.route) {
          <a [routerLink]="card.route" class="section-card" [class.disabled]="!card.enabled">
            <div class="card-icon">{{ card.icon }}</div>
            <div class="card-body">
              <div class="card-label">{{ card.label }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="pct(card)"></div>
                </div>
                <span class="card-pct">{{ pct(card).toFixed(1) }}%</span>
              </div>
              <div class="card-counts">{{ card.completed }}/{{ card.total }}</div>
            </div>
            @if (!card.enabled) {
              <div class="card-disabled-badge">Disabled</div>
            }
          </a>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1200px; }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 32px 0 24px;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 20px;
      gap: 24px;
    }
    .dashboard-title {
      font-size: 28px;
      font-weight: 800;
      color: var(--color-gold);
      letter-spacing: 0.1em;
      margin: 0 0 4px;
    }
    .dashboard-subtitle {
      font-size: 13px;
      color: var(--color-text-muted);
      margin: 0;
      letter-spacing: 0.05em;
    }
    .dashboard-overall {
      text-align: right;
    }
    .overall-pct {
      font-size: 36px;
      font-weight: 800;
      color: var(--color-gold);
      line-height: 1;
    }
    .overall-label {
      font-size: 11px;
      color: var(--color-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 4px;
    }
    .rank-badge {
      display: inline-block;
      margin-top: 6px;
      padding: 3px 10px;
      background: var(--color-surface2);
      border: 1px solid var(--color-gold);
      border-radius: 12px;
      font-size: 11px;
      color: var(--color-gold);
      font-weight: 600;
      letter-spacing: 0.05em;
    }
    .overall-bar {
      margin-bottom: 28px;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
    }
    .section-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .section-card:hover:not(.disabled) {
      border-color: var(--color-gold);
      background: var(--color-surface2);
      transform: translateY(-1px);
    }
    .section-card.disabled {
      opacity: 0.45;
    }
    .card-icon {
      font-size: 24px;
      width: 36px;
      text-align: center;
      flex-shrink: 0;
      color: var(--color-gold);
    }
    .card-body { flex: 1; min-width: 0; }
    .card-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 6px;
      letter-spacing: 0.03em;
    }
    .card-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .card-progress .progress-bar-bg { flex: 1; }
    .card-pct {
      font-size: 11px;
      color: var(--color-gold);
      font-weight: 600;
      width: 38px;
      text-align: right;
      flex-shrink: 0;
    }
    .card-counts {
      font-size: 11px;
      color: var(--color-text-muted);
    }
    .card-disabled-badge {
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 9px;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
  `]
})
export class DashboardComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);

  private readonly data = toSignal(this.dataService.getData());

  constructor() {
    effect(() => {
      const enabledCards = this.cards().filter(c => c.enabled && c.total > 0);
      const done = enabledCards.reduce((a, c) => a + c.completed, 0);
      const total = enabledCards.reduce((a, c) => a + c.total, 0);
      this.tracker.setOverallProgress(done, total);
    });
  }

  readonly cards = computed<SectionCard[]>(() => {
    const d = this.data();
    if (!d) return [];
    const toggles = this.tracker.sectionToggles();

    return [
      { label: 'Quests', route: '/quests', icon: '◈', enabled: toggles.quests, ...this.calcProgress('quest', d.quests?.length ?? 0) },
      { label: 'Gear', route: '/gear', icon: '⚔', enabled: toggles.gear, ...this.calcGearProgress(d) },
      { label: 'Lich Gear', route: '/lich-gear', icon: '☠', enabled: toggles.lichGear, ...this.calcProgress('lich', this.lichTotal(d)) },
      { label: 'Incarnon', route: '/incarnon', icon: '◉', enabled: toggles.incarnon, ...this.calcProgress('incarnon', this.incarnonTotal(d)) },
      { label: 'Arcanes', route: '/arcanes', icon: '✦', enabled: toggles.arcanes, ...this.calcProgress('arcane', this.arcaneTotal(d)) },
      { label: 'Mods', route: '/mods', icon: '▣', enabled: toggles.mods, ...this.calcProgress('mod', d.mods?.length ?? 0) },
      { label: 'Subsume', route: '/subsume', icon: '⬡', enabled: toggles.subsume, ...this.calcProgress('subsume', d.subsume?.length ?? 0) },
      { label: 'Railjack', route: '/railjack', icon: '◆', enabled: toggles.railjack, ...this.calcProgress('rj', this.rjTotal(d)) },
      { label: 'Relics', route: '/relics', icon: '◇', enabled: toggles.relics, ...this.calcProgress('relic', this.relicTotal(d)) },
      { label: 'Blueprints', route: '/blueprints', icon: '📋', enabled: toggles.blueprints, ...this.calcProgress('bp', this.bpTotal(d)) },
      { label: 'Items', route: '/items', icon: '◻', enabled: toggles.items, ...this.calcProgress('item', this.itemTotal(d)) },
      { label: 'Cosmetics', route: '/cosmetics', icon: '◈', enabled: toggles.cosmetics, ...this.calcProgress('cos', this.cosTotal(d)) },
      { label: 'Collectable', route: '/collectable', icon: '⊕', enabled: toggles.collectable, ...this.calcProgress('col', this.colTotal(d)) },
      { label: 'Decorations', route: '/decorations', icon: '⊞', enabled: toggles.decorations, ...this.calcProgress('dec', this.decTotal(d)) },
      { label: 'Codex', route: '/codex', icon: '⊟', enabled: toggles.codex, ...this.calcProgress('codex', this.codexTotal(d)) },
      { label: 'Market', route: '/market', icon: '◎', enabled: toggles.market, ...this.calcProgress('market', this.marketTotal(d)) },
      { label: 'Extra', route: '/extra', icon: '⊗', enabled: toggles.extra, ...this.calcProgress('extra', this.extraTotal(d)) },
      { label: 'Modular Gear', route: '/modular-gear', icon: '⬢', enabled: toggles.modularGear, ...this.calcProgress('mod_gear', this.modGearTotal(d)) },
    ];
  });

  readonly overallPct = computed(() => {
    const enabled = this.cards().filter(c => c.enabled && c.total > 0);
    if (!enabled.length) return 0;
    const done = enabled.reduce((a, c) => a + c.completed, 0);
    const total = enabled.reduce((a, c) => a + c.total, 0);
    return total > 0 ? (done / total) * 100 : 0;
  });

  readonly rankName = computed(() => {
    const pct = this.overallPct();
    if (pct === 0) return 'Baby Tenno';
    if (pct < 10) return 'Rookie Tenno';
    if (pct < 25) return 'Tenno Initiate';
    if (pct < 40) return 'Veteran Tenno';
    if (pct < 55) return 'Elite Tenno';
    if (pct < 70) return 'Master Tenno';
    if (pct < 85) return 'Grand Master';
    if (pct < 95) return 'Legendary Tenno';
    return 'True Completionist';
  });

  pct(card: SectionCard): number {
    return card.total > 0 ? (card.completed / card.total) * 100 : 0;
  }

  private calcProgress(prefix: string, total: number): { completed: number; total: number } {
    const checkboxes = this.tracker.checkboxes();
    const completed = Object.keys(checkboxes).filter(k => k.startsWith(prefix + ':') && checkboxes[k]).length;
    return { completed, total };
  }

  private calcGearProgress(d: TrackerData): { completed: number; total: number } {
    return this.calcProgress('gear', this.gearTotal(d));
  }

  private gearTotal(d: TrackerData): number {
    if (!d.gear) return 0;
    return Object.values(d.gear).reduce((a, v) => a + v.length, 0);
  }

  private lichTotal(d: TrackerData): number {
    if (!d.lichGear) return 0;
    return Object.values(d.lichGear).reduce((a, v) => a + v.length, 0);
  }

  private incarnonTotal(d: TrackerData): number {
    if (!d.incarnon) return 0;
    return d.incarnon.reduce((a: number, f: IncarnonEntry) => a + f.weapons.length, 0);
  }

  private arcaneTotal(d: TrackerData): number {
    if (!d.arcanes) return 0;
    return Object.values(d.arcanes).reduce((a, v) => a + v.length, 0);
  }

  private rjTotal(d: TrackerData): number {
    return (d.railjack?.intrinsics?.length ?? 0) + (d.railjack?.components?.length ?? 0);
  }

  private relicTotal(d: TrackerData): number {
    if (!d.relics) return 0;
    return Object.values(d.relics).reduce((a, v) => a + v.length, 0);
  }

  private bpTotal(d: TrackerData): number {
    if (!d.blueprints) return 0;
    let t = 0;
    for (const cat of Object.values(d.blueprints)) {
      for (const items of Object.values(cat)) {
        t += items.length;
      }
    }
    return t;
  }

  private itemTotal(d: TrackerData): number {
    if (!d.items) return 0;
    return Object.values(d.items).reduce((a, v) => a + v.length, 0);
  }

  private cosTotal(d: TrackerData): number {
    if (!d.cosmetics) return 0;
    let t = 0;
    for (const cat of Object.values(d.cosmetics)) {
      for (const items of Object.values(cat)) t += items.length;
    }
    return t;
  }

  private colTotal(d: TrackerData): number {
    if (!d.collectable) return 0;
    return Object.values(d.collectable).reduce((a, v) => a + v.length, 0);
  }

  private decTotal(d: TrackerData): number {
    if (!d.decorations) return 0;
    return Object.values(d.decorations).reduce((a, v) => a + v.length, 0);
  }

  private codexTotal(d: TrackerData): number {
    if (!d.codex) return 0;
    return Object.values(d.codex).reduce((a, v) => a + v.length, 0);
  }

  private marketTotal(d: TrackerData): number {
    if (!d.market) return 0;
    return Object.values(d.market).reduce((a, v) => a + v.length, 0);
  }

  private extraTotal(d: TrackerData): number {
    if (!d.extra) return 0;
    return Object.values(d.extra).reduce((a, v) => a + v.length, 0);
  }

  private modGearTotal(d: TrackerData): number {
    if (!d.modularGear) return 0;
    return Object.values(d.modularGear).reduce((a, v) => a + v.length, 0);
  }
}
