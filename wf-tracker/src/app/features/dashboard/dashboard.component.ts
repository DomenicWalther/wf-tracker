import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { TrackerData, IncarnonEntry } from '../../core/models/tracker.models';
import { WorldStatePanelComponent } from '../../shared/components/world-state-panel/world-state-panel.component';

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
  imports: [RouterLink, WorldStatePanelComponent],
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

      <app-world-state-panel />

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
      padding: 36px 0 28px;
      border-bottom: 1px solid var(--color-border);
      margin-bottom: 24px;
      gap: 24px;
    }
    .dashboard-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0.06em;
      margin: 0 0 5px;
    }
    .dashboard-subtitle {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: 0;
      letter-spacing: 0.04em;
    }
    .dashboard-overall {
      text-align: right;
      flex-shrink: 0;
    }
    .overall-pct {
      font-size: 32px;
      font-weight: 700;
      color: var(--color-accent-light);
      line-height: 1;
      letter-spacing: -0.01em;
    }
    .overall-label {
      font-size: 10px;
      color: var(--color-text-muted);
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-top: 5px;
      font-weight: 600;
    }
    .rank-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 3px 10px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 99px;
      font-size: 11px;
      color: var(--color-text-dim);
      font-weight: 500;
      letter-spacing: 0.03em;
    }
    .overall-bar {
      margin-bottom: 28px;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
      margin-top: 24px;
    }
    .section-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      text-decoration: none;
      transition: border-color var(--transition-mid), background var(--transition-mid), box-shadow var(--transition-mid);
      position: relative;
      overflow: hidden;
    }
    .section-card:hover:not(.disabled) {
      border-color: var(--color-accent);
      background: var(--color-surface2);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .section-card:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .section-card.disabled {
      opacity: 0.38;
      pointer-events: none;
    }
    .card-icon {
      font-size: 18px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      color: var(--color-accent);
      background: var(--color-surface2);
      border-radius: 6px;
      transition: color var(--transition-fast);
    }
    .section-card:hover:not(.disabled) .card-icon {
      color: var(--color-accent-light);
    }
    .card-body { flex: 1; min-width: 0; }
    .card-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text);
      margin-bottom: 8px;
      letter-spacing: 0.02em;
    }
    .card-progress {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 5px;
    }
    .card-progress .progress-bar-bg { flex: 1; }
    .card-pct {
      font-size: 11px;
      color: var(--color-accent-light);
      font-weight: 600;
      width: 36px;
      text-align: right;
      flex-shrink: 0;
    }
    .card-counts {
      font-size: 11px;
      color: var(--color-text-muted);
    }
    .card-disabled-badge {
      position: absolute;
      top: 7px;
      right: 9px;
      font-size: 9px;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-weight: 600;
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

  private readonly GEAR_SECTION_COLUMNS: Record<string, string[]> = {
    warframes:      ['mastery', 'reactor', 'exilus', 'shards', 'tau', 'maxBuild', 'auraForma', 'lens'],
    primaries:      ['mastery', 'reactor', 'arcaneAdapter', 'maxBuild'],
    secondaries:    ['mastery', 'reactor', 'arcaneAdapter', 'maxBuild'],
    melees:         ['mastery', 'reactor', 'arcaneAdapter', 'maxBuild', 'stanceForma'],
    companions:     ['mastery', 'maxBuild'],
    archwings:      ['mastery', 'maxBuild'],
    archwingWeapons:['mastery', 'maxBuild'],
    extras:         ['mastery', 'maxBuild'],
  };

  private readonly GEAR_ALL_COLUMNS = [
    { key: 'mastery',       settingKey: null },
    { key: 'reactor',       settingKey: 'reactor' },
    { key: 'exilus',        settingKey: 'exilus' },
    { key: 'shards',        settingKey: 'shards' },
    { key: 'tau',           settingKey: 'tauForged' },
    { key: 'maxBuild',      settingKey: 'maxBuild' },
    { key: 'auraForma',     settingKey: 'auraForma' },
    { key: 'stanceForma',   settingKey: 'stanceForma' },
    { key: 'lens',          settingKey: 'lens' },
    { key: 'arcaneAdapter', settingKey: 'arcaneAdapter' },
  ] as const;

  private calcGearProgress(d: TrackerData): { completed: number; total: number } {
    if (!d.gear) return { completed: 0, total: 0 };
    const gearSettings = this.tracker.settings().gear;
    const isFounder = this.tracker.settings().isFounder;
    const primeOnly = gearSettings.primeOnlyGear;
    const checkboxes = this.tracker.checkboxes();

    const activeCols = this.GEAR_ALL_COLUMNS.filter(
      c => !c.settingKey || gearSettings[c.settingKey as keyof typeof gearSettings]
    );

    let completed = 0, total = 0;
    for (const [sectionKey, items] of Object.entries(d.gear)) {
      const allowed = this.GEAR_SECTION_COLUMNS[sectionKey] ?? ['mastery'];
      const sectionCols = activeCols.filter(c => allowed.includes(c.key));
      const filteredItems = isFounder ? items : items.filter((i: { name: string; isFounderOnly?: boolean }) => !i.isFounderOnly);
      const primeNames = primeOnly ? new Set(filteredItems.map((i: { name: string }) => i.name)) : null;

      for (const item of filteredItems) {
        for (const col of sectionCols) {
          if (primeNames && col.key !== 'mastery' && primeNames.has(item.name + ' Prime') && !item.name.endsWith(' Prime')) continue;
          total++;
          if (checkboxes[`gear:${item.name}:${col.key}`]) completed++;
        }
      }
    }
    return { completed, total };
  }

  private lichTotal(d: TrackerData): number {
    if (!d.lichGear) return 0;
    return Object.values(d.lichGear).reduce((a, v) => a + v.length, 0) * 3;
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
