import { Component, inject, computed, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, icons } from 'lucide-angular';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { HonoriaService } from '../../core/services/honoria.service';
import { TrackerData, IncarnonEntry, SectionToggles } from '../../core/models/tracker.models';
import { WorldStatePanelComponent } from '../../shared/components/world-state-panel/world-state-panel.component';
import { ALL_GEAR_COLUMNS, GEAR_SECTION_COLUMNS } from '../../core/config/gear-columns';
import { countGearSection } from '../../core/utils/gear-variants';

type LucideIconData = (typeof icons)[keyof typeof icons];

const {
  ScrollText, Sword, Skull, Zap, Sparkles, Layers, FlaskConical, Rocket,
  Gem, ClipboardList, Package, Palette, Archive, Flower2, BookOpen,
  ShoppingBag, Boxes, Component: ComponentIcon, Award, Sticker,
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
        <div class="progress-bar-bg" style="height: 10px">
          <div class="progress-bar-fill" [style.width.%]="overallPct()"></div>
        </div>
      </div>

      @if (whatNext().length > 0) {
        <section class="whats-next" aria-label="What's next">
          <h2 class="whats-next-heading">WHAT'S NEXT</h2>
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
        </section>
      }

      <app-world-state-panel />

      <div class="cards-grid">
        @for (card of cards(); track card.route) {
          <a [routerLink]="card.route" class="section-card" [class.disabled]="!card.enabled">
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
    .whats-next {
      margin-bottom: 20px;
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
      pointer-events: none;
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

  private readonly data = toSignal(this.dataService.getData());

  readonly cards = computed<SectionCard[]>(() => {
    const d = this.data();
    if (!d) return [];
    const toggles = this.tracker.sectionToggles();

    return [
      { key: 'honoria',    label: 'Honoria',       route: '/honoria',      icon: Award,         enabled: toggles.honoria,    completed: this.honoria.completed(), total: this.honoria.total },
      { key: 'quests',     label: 'Quests',       route: '/quests',       icon: ScrollText,    enabled: toggles.quests,      ...this.calcProgress('quest',    d.quests?.length ?? 0) },
      { key: 'gear',       label: 'Gear',          route: '/gear',         icon: Sword,         enabled: toggles.gear,        ...this.calcGearProgress(d) },
      { key: 'lichGear',   label: 'Lich Gear',     route: '/lich-gear',    icon: Skull,         enabled: toggles.lichGear,    ...this.calcProgress('lich',     this.lichTotal(d)) },
      { key: 'incarnon',   label: 'Incarnon',      route: '/incarnon',     icon: Zap,           enabled: toggles.incarnon,    ...this.calcProgress('incarnon', this.incarnonTotal(d)) },
      { key: 'arcanes',    label: 'Arcanes',       route: '/arcanes',      icon: Sparkles,      enabled: toggles.arcanes,     ...this.calcProgress('arcane',   this.arcaneTotal(d)) },
      { key: 'mods',       label: 'Mods',          route: '/mods',         icon: Layers,        enabled: toggles.mods,        ...this.calcProgress('mod',      this.modTotal(d)) },
      { key: 'atragraph',  label: 'Atragraph',     route: '/atragraph',    icon: Sticker,       enabled: toggles.atragraph,   ...this.calcProgress('atragraph', this.atragraphTotal(d)) },
      { key: 'subsume',    label: 'Subsume',       route: '/subsume',      icon: FlaskConical,  enabled: toggles.subsume,     ...this.calcProgress('subsume',  d.subsume?.length ?? 0) },
      { key: 'railjack',   label: 'Railjack',      route: '/railjack',     icon: Rocket,        enabled: toggles.railjack,    ...this.calcProgress('rj',       this.rjTotal(d)) },
      { key: 'relics',     label: 'Relics',        route: '/relics',       icon: Gem,           enabled: toggles.relics,      ...this.calcProgress('relic',    this.relicTotal(d)) },
      { key: 'blueprints', label: 'Blueprints',    route: '/blueprints',   icon: ClipboardList, enabled: toggles.blueprints,  ...this.calcProgress('bp',       this.bpTotal(d)) },
      { key: 'items',      label: 'Items',         route: '/items',        icon: Package,       enabled: toggles.items,       ...this.calcProgress('item',     this.itemTotal(d)) },
      { key: 'cosmetics',  label: 'Cosmetics',     route: '/cosmetics',    icon: Palette,       enabled: toggles.cosmetics,   ...this.calcProgress('cos',      this.cosTotal(d)) },
      { key: 'collectable',label: 'Collectable',   route: '/collectable',  icon: Archive,       enabled: toggles.collectable, ...this.calcProgress('col',      this.colTotal(d)) },
      { key: 'decorations',label: 'Decorations',   route: '/decorations',  icon: Flower2,       enabled: toggles.decorations, ...this.calcProgress('dec',      this.decTotal(d)) },
      { key: 'codex',      label: 'Codex',         route: '/codex',        icon: BookOpen,      enabled: toggles.codex,       ...this.calcProgress('codex',    this.codexTotal(d)) },
      { key: 'market',     label: 'Market',        route: '/market',       icon: ShoppingBag,   enabled: toggles.market,      ...this.calcProgress('market',   this.marketTotal(d)) },
      { key: 'extra',      label: 'Extra',         route: '/extra',        icon: Boxes,         enabled: toggles.extra,       ...this.calcProgress('extra',    this.extraTotal(d)) },
      { key: 'modularGear',label: 'Modular Gear',  route: '/modular-gear', icon: ComponentIcon, enabled: toggles.modularGear, ...this.calcProgress('mod_gear', this.modGearTotal(d)) },
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

  private calcProgress(prefix: string, total: number): { completed: number; total: number } {
    const checkboxes = this.tracker.checkboxes();
    const completed = Object.keys(checkboxes).filter(k => k.startsWith(prefix + ':') && checkboxes[k]).length;
    return { completed, total };
  }

  private calcGearProgress(d: TrackerData): { completed: number; total: number } {
    if (!d.gear) return { completed: 0, total: 0 };
    const gearSettings = this.tracker.settings().gear;
    const isFounder = this.tracker.settings().isFounder;
    const primeOnly = gearSettings.primeOnlyGear;
    const checkboxes = this.tracker.checkboxes();

    const activeCols = ALL_GEAR_COLUMNS.filter(
      c => !c.settingKey || (gearSettings as unknown as Record<string, unknown>)[c.settingKey]
    );

    const isChecked = (name: string, col: string) => !!checkboxes[`gear:${name}:${col}`];

    let completed = 0, total = 0;
    for (const [sectionKey, items] of Object.entries(d.gear)) {
      const allowed = GEAR_SECTION_COLUMNS[sectionKey] ?? ['mastery'];
      const sectionCols = activeCols.filter(c => allowed.includes(c.key));
      const filteredItems = isFounder ? items : items.filter((i: { name: string; isFounderOnly?: boolean }) => !i.isFounderOnly);

      if (!primeOnly) {
        for (const item of filteredItems) {
          for (const col of sectionCols) {
            total++;
            if (isChecked(item.name, col.key)) completed++;
          }
        }
        continue;
      }

      const upgradeCols = sectionCols.filter(c => c.key !== 'mastery').map(c => c.key);
      const r = countGearSection(filteredItems.map((i: { name: string }) => i.name), upgradeCols, isChecked);
      total += r.total;
      completed += r.completed;
    }
    return { completed, total };
  }

  private lichTotal(d: TrackerData): number {
    if (!d.lichGear) return 0;
    return Object.values(d.lichGear).reduce((a, v) => a + v.length, 0) * 3;
  }

  private modTotal(d: TrackerData): number {
    if (!d.mods) return 0;
    if (this.tracker.settings().mod.hoarder) {
      return d.mods.reduce((a, m) => a + m.maxRank + 1, 0);
    }
    return d.mods.length;
  }

  private atragraphTotal(d: TrackerData): number {
    if (!d.atragraph) return 0;
    if (this.tracker.settings().atragraph.collectAll) {
      return d.atragraph.reduce((a, e) => a + e.variants.length, 0);
    }
    return d.atragraph.length;
  }

  private incarnonTotal(d: TrackerData): number {
    if (!d.incarnon) return 0;
    const completionist = this.tracker.settings().incarnon.completionist;
    const rows = d.incarnon.reduce((a: number, f: IncarnonEntry) =>
      a + (completionist || f.name === '1 FAMILY' ? f.weapons.length : 1), 0);
    return rows * 3;
  }

  private arcaneTotal(d: TrackerData): number {
    if (!d.arcanes) return 0;
    const base = Object.values(d.arcanes).reduce((a, v) => a + v.length, 0);
    return this.tracker.settings().arcane.psycho ? base * 5 : base;
  }

  private rjTotal(d: TrackerData): number {
    const intrinsics = d.railjack?.intrinsics?.length ?? 0;
    const components = d.railjack?.components ?? [];
    if (this.tracker.settings().railjack.partHoarder) {
      return intrinsics + components.length;
    }
    const unique = new Set(components.map((c: { house: string; component: string }) => c.house + ':' + c.component));
    return intrinsics + unique.size;
  }

  private relicTotal(d: TrackerData): number {
    if (!d.relics) return 0;
    const base = Object.values(d.relics).reduce((a, v) => a + v.length, 0);
    return base * (this.tracker.settings().relic.hoarder ? 4 : 2);
  }

  private bpTotal(d: TrackerData): number {
    if (!d.blueprints) return 0;
    const showOld = this.tracker.settings().blueprint.hoarder;
    let t = 0;
    for (const cat of Object.values(d.blueprints)) {
      for (const items of Object.values(cat)) {
        t += showOld ? items.length : items.filter(i => !i.isOld).length;
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
    const s = this.tracker.settings().cosmetics;
    let t = 0;
    for (const [cat, subs] of Object.entries(d.cosmetics)) {
      if (cat === 'TENNOGEN' && !s.tennogen) continue;
      for (const [sub, items] of Object.entries(subs)) {
        if (cat === 'TENNOGEN' && sub === 'CONSOLE' && !s.consoleExclusive) continue;
        if (cat === 'REMAINING COSMETICS' && sub === 'Extra' && !s.extra) continue;
        t += items.length;
      }
    }
    return t;
  }

  private colTotal(d: TrackerData): number {
    if (!d.collectable) return 0;
    const s = this.tracker.settings().collectable;
    return Object.entries(d.collectable).reduce((a, [key, v]) =>
      a + (key === 'OLD IMPOSSIBLE GLYPHS' && !s.old ? 0 : v.length), 0);
  }

  private decTotal(d: TrackerData): number {
    if (!d.decorations) return 0;
    const s = this.tracker.settings().decorations;
    return Object.entries(d.decorations).reduce((a, [key, v]) =>
      a + (key === 'Tennocon Locked' && !s.extra ? 0 : v.length), 0);
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
