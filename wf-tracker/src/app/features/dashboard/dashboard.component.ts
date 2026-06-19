import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, icons } from 'lucide-angular';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { HonoriaService } from '../../core/services/honoria.service';
import { TrackerData, SectionToggles } from '../../core/models/tracker.models';
import { WorldStatePanelComponent } from '../../shared/components/world-state-panel/world-state-panel.component';

type LucideIconData = (typeof icons)[keyof typeof icons];

const {
  ScrollText, Sword, Skull, Zap, Sparkles, Layers, FlaskConical, Rocket,
  Gem, ClipboardList, Package, Palette, Archive, Flower2, BookOpen,
  ShoppingBag, Boxes, Component: ComponentIcon, Award, Sticker, Trophy,
} = icons;

const PREFIX_MAP: Record<string, { label: string; route: string }> = {
  gear:     { label: 'Gear',        route: '/gear' },
  arcane:   { label: 'Arcanes',     route: '/arcanes' },
  quest:    { label: 'Quests',      route: '/quests' },
  mod:      { label: 'Mods',        route: '/mods' },
  atragraph:{ label: 'Atragraph',   route: '/atragraph' },
  lich:     { label: 'Lich Gear',   route: '/lich-gear' },
  relic:    { label: 'Relics',      route: '/relics' },
  incarnon: { label: 'Incarnon',    route: '/incarnon' },
  subsume:  { label: 'Subsume',     route: '/subsume' },
  rj:       { label: 'Railjack',    route: '/railjack' },
  cos:      { label: 'Cosmetics',   route: '/cosmetics' },
  bp:       { label: 'Blueprints',  route: '/blueprints' },
  item:     { label: 'Items',       route: '/items' },
  col:      { label: 'Collectable', route: '/collectable' },
  dec:      { label: 'Decorations', route: '/decorations' },
  codex:    { label: 'Codex',       route: '/codex' },
  market:   { label: 'Market',      route: '/market' },
  extra:    { label: 'Extra',       route: '/extra' },
};

interface WhatsNextItem {
  label: string;
  section: string;
  pct: number;
  route: string;
}

interface SectionCard {
  key: keyof SectionToggles;
  label: string;
  route: string;
  icon: LucideIconData;
  completed: number;
  total: number;
  enabled: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, WorldStatePanelComponent, LucideAngularModule],
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
        <div class="progress-bar-bg" style="height: 14px">
          <div class="progress-bar-fill" [style.width.%]="overallPct()"></div>
        </div>
      </div>

      <section class="whats-next" aria-label="What's next">
        <h2 class="whats-next-heading">WHAT'S NEXT</h2>
        @if (whatNext().length > 0) {
          <div class="whats-next-list">
            @for (item of whatNext(); track item.label + item.section) {
              <a [routerLink]="item.route" class="wn-chip">
                <span class="wn-tag">{{ item.section }}</span>
                <span class="wn-name">{{ item.label }}</span>
                <span class="wn-bar-wrap" aria-hidden="true">
                  <span class="wn-bar-fill" [style.width.%]="item.pct"></span>
                </span>
                <span class="wn-pct">{{ item.pct.toFixed(0) }}%</span>
              </a>
            }
          </div>
        } @else {
          <p class="whats-next-empty">Check off items to see near-complete sections here.</p>
        }
      </section>

      <app-world-state-panel />

      <div class="cards-grid">
        @for (card of cards(); track card.route) {
          <a [routerLink]="card.enabled ? card.route : '/settings'" class="section-card" [class.disabled]="!card.enabled">
            <div class="card-icon">
              <lucide-icon [img]="card.icon" [size]="18" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
            </div>
            <div class="card-body">
              <div class="card-label">{{ card.label }}</div>
              <div class="card-progress">
                <div class="progress-bar-bg">
                  <div class="progress-bar-fill" [style.width.%]="pct(card)"></div>
                </div>
                <span class="card-pct">{{ pct(card).toFixed(1) }}%</span>
              </div>
              <div class="card-counts">{{ card.completed }}/{{ card.total }}</div>
              @if (!card.enabled) {
                <div class="card-enable-hint">Enable in Settings →</div>
              }
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
    @media (max-width: 600px) {
      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
        padding: 20px 0 20px;
        gap: 16px;
      }
      .dashboard-overall {
        text-align: left;
      }
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
    .overall-bar .progress-bar-bg,
    .overall-bar .progress-bar-fill {
      border-radius: 8px;
    }
    .overall-bar .progress-bar-fill {
      background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
    }
    .whats-next {
      margin-bottom: 20px;
    }
    .whats-next-empty {
      font-size: 12px;
      color: var(--color-text-muted);
      font-style: italic;
      margin: 0;
    }
    .whats-next-heading {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-accent-light);
      margin: 0 0 10px;
    }
    .whats-next-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .wn-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 10px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 99px;
      text-decoration: none;
      font-size: 12px;
      color: var(--color-text);
      transition: border-color var(--transition-fast), background var(--transition-fast);
    }
    .wn-chip:hover {
      border-color: var(--color-accent);
      background: var(--color-surface2);
    }
    .wn-chip:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .wn-tag {
      font-size: 10px;
      font-weight: 600;
      color: var(--color-text-muted);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .wn-name { font-weight: 500; }
    .wn-bar-wrap {
      display: inline-block;
      width: 40px;
      height: 4px;
      background: var(--color-surface2);
      border-radius: 2px;
      overflow: hidden;
      flex-shrink: 0;
    }
    .wn-bar-fill {
      display: block;
      height: 100%;
      background: var(--color-accent);
      border-radius: 2px;
    }
    .wn-pct {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-accent-light);
      width: 28px;
      text-align: right;
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
    }
    .section-card.disabled:hover {
      border-color: var(--color-border);
    }
    .card-icon {
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
    .card-enable-hint {
      font-size: 10px;
      color: var(--color-text-muted);
      margin-top: 4px;
      letter-spacing: 0.03em;
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
  private readonly honoria = inject(HonoriaService);

  private readonly data = this.dataService.data;

  readonly cards = computed<SectionCard[]>(() => {
    const d = this.data();
    if (!d) return [];
    const toggles = this.tracker.sectionToggles();
    const p = (key: keyof SectionToggles) => this.tracker.sectionProgress(key);

    return [
      { key: 'honoria',    label: 'Honoria',       route: '/honoria',      icon: Award,         enabled: toggles.honoria,     ...p('honoria') },
      { key: 'accolade',   label: 'Accolade',      route: '/accolade',     icon: Trophy,        enabled: toggles.accolade,    ...this.calcAccoladeProgress(d) },
      { key: 'quests',     label: 'Quests',        route: '/quests',       icon: ScrollText,    enabled: toggles.quests,      ...p('quests') },
      { key: 'gear',       label: 'Gear',          route: '/gear',         icon: Sword,         enabled: toggles.gear,        ...p('gear') },
      { key: 'lichGear',   label: 'Lich Gear',     route: '/lich-gear',    icon: Skull,         enabled: toggles.lichGear,    ...p('lichGear') },
      { key: 'incarnon',   label: 'Incarnon',      route: '/incarnon',     icon: Zap,           enabled: toggles.incarnon,    ...p('incarnon') },
      { key: 'arcanes',    label: 'Arcanes',       route: '/arcanes',      icon: Sparkles,      enabled: toggles.arcanes,     ...p('arcanes') },
      { key: 'mods',       label: 'Mods',          route: '/mods',         icon: Layers,        enabled: toggles.mods,        ...p('mods') },
      { key: 'atragraph',  label: 'Atragraph',     route: '/atragraph',    icon: Sticker,       enabled: toggles.atragraph,   ...p('atragraph') },
      { key: 'subsume',    label: 'Subsume',       route: '/subsume',      icon: FlaskConical,  enabled: toggles.subsume,     ...p('subsume') },
      { key: 'railjack',   label: 'Railjack',      route: '/railjack',     icon: Rocket,        enabled: toggles.railjack,    ...p('railjack') },
      { key: 'relics',     label: 'Relics',        route: '/relics',       icon: Gem,           enabled: toggles.relics,      ...p('relics') },
      { key: 'blueprints', label: 'Blueprints',    route: '/blueprints',   icon: ClipboardList, enabled: toggles.blueprints,  ...p('blueprints') },
      { key: 'items',      label: 'Items',         route: '/items',        icon: Package,       enabled: toggles.items,       ...p('items') },
      { key: 'cosmetics',  label: 'Cosmetics',     route: '/cosmetics',    icon: Palette,       enabled: toggles.cosmetics,   ...p('cosmetics') },
      { key: 'collectable',label: 'Collectable',   route: '/collectable',  icon: Archive,       enabled: toggles.collectable, ...p('collectable') },
      { key: 'decorations',label: 'Decorations',   route: '/decorations',  icon: Flower2,       enabled: toggles.decorations, ...p('decorations') },
      { key: 'codex',      label: 'Codex',         route: '/codex',        icon: BookOpen,      enabled: toggles.codex,       ...p('codex') },
      { key: 'market',     label: 'Market',        route: '/market',       icon: ShoppingBag,   enabled: toggles.market,      ...p('market') },
      { key: 'extra',      label: 'Extra',         route: '/extra',        icon: Boxes,         enabled: toggles.extra,       ...p('extra') },
      { key: 'modularGear',label: 'Modular Gear',  route: '/modular-gear', icon: ComponentIcon, enabled: toggles.modularGear, ...p('modularGear') },
    ] as SectionCard[];
  });

  readonly whatNext = computed<WhatsNextItem[]>(() => {
    const checkboxes = this.tracker.checkboxes();
    const groups = new Map<string, { total: number; completed: number }>();
    for (const key of Object.keys(checkboxes)) {
      const parts = key.split(':');
      if (parts.length < 2) continue;
      const base = parts[0] + ':' + parts[1];
      const existing = groups.get(base) ?? { total: 0, completed: 0 };
      existing.total++;
      if (checkboxes[key]) existing.completed++;
      groups.set(base, existing);
    }
    const items: WhatsNextItem[] = [];
    for (const [base, counts] of groups) {
      if (counts.completed === 0 || counts.completed >= counts.total) continue;
      const colonIdx = base.indexOf(':');
      const prefix = base.slice(0, colonIdx);
      const name = base.slice(colonIdx + 1);
      const meta = PREFIX_MAP[prefix];
      if (!meta) continue;
      items.push({ label: name, section: meta.label, pct: (counts.completed / counts.total) * 100, route: meta.route });
    }
    items.sort((a, b) => b.pct - a.pct);
    return items.slice(0, 5);
  });

  readonly overallPct = computed(() => {
    const { completed, total } = this.tracker.totalTrackable();
    return total > 0 ? (completed / total) * 100 : 0;
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

  private calcAccoladeProgress(d: TrackerData): { completed: number; total: number } {
    if (!d.accolade) return { completed: 0, total: 0 };
    const checkboxes = this.tracker.checkboxes();
    let completed = 0;
    let total = 0;
    for (const items of Object.values(d.accolade)) {
      for (const item of items) {
        total++;
        if (checkboxes[`col:${item}`]) completed++;
      }
    }
    return { completed, total };
  }
}
