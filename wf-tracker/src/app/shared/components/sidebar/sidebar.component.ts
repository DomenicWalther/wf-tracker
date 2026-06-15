import { Component, inject, signal, computed, ChangeDetectionStrategy, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, icons } from 'lucide-angular';
import { TrackerService } from '../../../core/services/tracker.service';
import { ThemeService } from '../../../core/services/theme.service';
import { PaletteService } from '../../../core/services/palette.service';

type LucideIconData = (typeof icons)[keyof typeof icons];

interface NavItem {
  label: string;
  route: string;
  icon: LucideIconData;
  section?: keyof import('../../../core/models/tracker.models').SectionToggles;
}

const {
  LayoutDashboard, ListChecks, Settings, Target,
  ScrollText, Sword, Skull, Zap, Sparkles, Layers, FlaskConical, Rocket,
  Gem, ClipboardList, Package, Palette, Archive, Flower2, BookOpen,
  ShoppingBag, Boxes, Component: ComponentIcon, History, ScanLine, SunMoon, Search, Award, Sticker, Trophy,
} = icons;

const OVERVIEW_ITEMS: NavItem[] = [
  { label: 'Dashboard',       route: '/dashboard',      icon: LayoutDashboard },
  { label: 'Scan Screenshot', route: '/scan',           icon: ScanLine },
  { label: 'Task Checklist',  route: '/task-checklist', icon: ListChecks },
  { label: 'Settings',        route: '/settings',       icon: Settings },
  { label: 'Goals',           route: '/goals',          icon: Target },
];

const INFO_ITEMS: NavItem[] = [
  { label: 'Version Log', route: '/version-log', icon: History },
];

const TRACKABLE_ITEMS: NavItem[] = [
  { label: 'Accolade',     route: '/accolade',      icon: Trophy },
  { label: 'Arcanes',      route: '/arcanes',       icon: Sparkles,      section: 'arcanes' },
  { label: 'Atragraph',    route: '/atragraph',     icon: Sticker,       section: 'atragraph' },
  { label: 'Blueprints',   route: '/blueprints',    icon: ClipboardList, section: 'blueprints' },
  { label: 'Codex',        route: '/codex',         icon: BookOpen,      section: 'codex' },
  { label: 'Collectable',  route: '/collectable',   icon: Archive,       section: 'collectable' },
  { label: 'Cosmetics',    route: '/cosmetics',     icon: Palette,       section: 'cosmetics' },
  { label: 'Decorations',  route: '/decorations',   icon: Flower2,       section: 'decorations' },
  { label: 'Extra',        route: '/extra',         icon: Boxes,         section: 'extra' },
  { label: 'Gear',         route: '/gear',          icon: Sword,         section: 'gear' },
  { label: 'Honoria',      route: '/honoria',       icon: Award },
  { label: 'Incarnon',     route: '/incarnon',      icon: Zap,           section: 'incarnon' },
  { label: 'Items',        route: '/items',         icon: Package,       section: 'items' },
  { label: 'Lich Gear',    route: '/lich-gear',     icon: Skull,         section: 'lichGear' },
  { label: 'Market',       route: '/market',        icon: ShoppingBag,   section: 'market' },
  { label: 'Mods',         route: '/mods',          icon: Layers,        section: 'mods' },
  { label: 'Modular Gear', route: '/modular-gear',  icon: ComponentIcon, section: 'modularGear' },
  { label: 'Quests',       route: '/quests',        icon: ScrollText,    section: 'quests' },
  { label: 'Railjack',     route: '/railjack',      icon: Rocket,        section: 'railjack' },
  { label: 'Relics',       route: '/relics',        icon: Gem,           section: 'relics' },
  { label: 'Subsume',      route: '/subsume',       icon: FlaskConical,  section: 'subsume' },
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mobileOpen()) {
      <div class="sidebar-overlay" (click)="mobileClose.emit()" aria-hidden="true"></div>
    }
    <aside class="sidebar" [class.collapsed]="collapsed()" [class.mobile-open]="mobileOpen()">
      <div class="sidebar-header">
        @if (!collapsed()) {
          <div class="logo">
            <span class="logo-wf">WF</span>
            <span class="logo-text">TRACKER</span>
          </div>
        }
        @if (collapsed()) {
          <div class="logo">
            <span class="logo-wf">WF</span>
          </div>
        }
        <button
          class="collapse-btn"
          type="button"
          (click)="toggleCollapsed()"
          title="Toggle sidebar"
          [attr.aria-label]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          [attr.aria-expanded]="!collapsed()"
        >
          <span aria-hidden="true">{{ collapsed() ? '›' : '‹' }}</span>
        </button>
      </div>

      @if (!collapsed()) {
        <div class="overall-progress">
          <div class="progress-label">Overall Progress</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" [style.width.%]="overallProgress()"></div>
          </div>
          <div class="progress-value">
            {{ overallProgress().toFixed(1) }}%
            <span class="progress-counts">{{ tracker.totalTrackable().completed }}/{{ tracker.totalTrackable().total }}</span>
          </div>
        </div>
      }

      <nav class="nav-content">
        @for (group of groups(); track group.group) {
          @if (!collapsed()) {
            <div class="nav-group">
              <div class="nav-group-label">{{ group.group }}</div>
            </div>
          }
          @for (item of group.items; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="active"
               class="nav-item"
               [class.section-disabled]="group.group === 'Disabled'"
               [title]="collapsed() ? item.label : ''"
               (click)="mobileClose.emit()">
              <lucide-icon class="nav-icon" [img]="item.icon" [size]="15" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
              @if (!collapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        }
      </nav>

      <div class="sidebar-footer">
        <button
          type="button"
          class="search-hint-btn"
          (click)="palette.open()"
          aria-label="Open command palette"
          title="Open command palette"
        >
          <lucide-icon [img]="searchIcon" [size]="14" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
          @if (!collapsed()) {
            <span class="search-hint-text">Search…</span>
            <kbd class="search-hint-kbd">Ctrl K</kbd>
          }
        </button>
        <button
          type="button"
          class="theme-btn"
          (click)="theme.toggle()"
          [title]="theme.isNeutralDark() ? 'Switch to blue-tinted theme' : 'Switch to neutral dark theme'"
          [attr.aria-label]="theme.isNeutralDark() ? 'Switch to blue-tinted theme' : 'Switch to neutral dark theme'"
          [attr.aria-pressed]="theme.isNeutralDark()"
        >
          <lucide-icon [img]="sunMoonIcon" [size]="14" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
          @if (!collapsed()) {
            <span>{{ theme.isNeutralDark() ? 'Blue Tint' : 'Neutral Dark' }}</span>
          }
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 216px;
      height: 100vh;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-mid);
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      overflow-x: hidden;
    }
    .nav-content {
      flex: 1;
      overflow-y: auto;
      padding: 6px 0 12px;
    }
    .sidebar.collapsed {
      width: 48px;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 12px;
      border-bottom: 1px solid var(--color-border);
      min-height: 56px;
      flex-shrink: 0;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }
    .logo-wf {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-accent-light);
      letter-spacing: 0.12em;
      flex-shrink: 0;
    }
    .logo-text {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.18em;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .collapse-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      width: 22px;
      height: 22px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color var(--transition-fast), color var(--transition-fast);
    }
    .collapse-btn:hover {
      border-color: var(--color-accent);
      color: var(--color-accent-light);
    }
    .collapse-btn:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .overall-progress {
      padding: 12px 14px;
      border-bottom: 1px solid var(--color-border);
    }
    .progress-label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--color-text-muted);
      margin-bottom: 7px;
      font-weight: 600;
    }
    .progress-value {
      font-size: 11px;
      color: var(--color-accent-light);
      margin-top: 5px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .progress-counts {
      font-size: 10px;
      color: var(--color-text-muted);
      font-weight: 400;
    }
    .nav-group {
      padding: 14px 14px 3px;
    }
    .nav-group-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 7px 14px;
      color: var(--color-text-dim);
      text-decoration: none;
      font-size: 13px;
      border-left: 2px solid transparent;
      transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
    }
    .nav-item:hover {
      background: var(--color-surface2);
      color: var(--color-text);
    }
    .nav-item:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: -2px;
    }
    .nav-item.active {
      border-left-color: var(--color-accent);
      background: var(--color-surface2);
      color: var(--color-accent-light);
    }
    .section-disabled {
      opacity: 0.45;
    }
    .nav-icon {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
      opacity: 0.65;
    }
    .nav-item.active .nav-icon,
    .nav-item:hover .nav-icon {
      opacity: 1;
    }
    .nav-label {
      white-space: nowrap;
      overflow: hidden;
      font-size: 12.5px;
    }
    .collapsed .nav-item {
      padding: 9px;
      justify-content: center;
    }
    .collapsed .nav-item.active {
      border-left-color: transparent;
      background: var(--color-surface2);
    }
    .collapsed .nav-icon {
      width: auto;
    }
    .sidebar-footer {
      padding: 8px 8px 12px;
      border-top: 1px solid var(--color-border);
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .search-hint-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      color: var(--color-text-muted);
      font-size: 12px;
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;
    }
    .search-hint-btn:hover {
      border-color: var(--color-gold);
      color: var(--color-gold-light);
      background: var(--color-surface2);
    }
    .search-hint-btn:focus-visible {
      outline: 2px solid var(--color-gold-light);
      outline-offset: 2px;
    }
    .search-hint-text {
      flex: 1;
      text-align: left;
    }
    .search-hint-kbd {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 1px 5px;
      font-size: 10px;
      font-family: inherit;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }
    .collapsed .search-hint-btn {
      justify-content: center;
      padding: 6px;
    }
    .theme-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 6px 8px;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: 5px;
      color: var(--color-text-muted);
      font-size: 12px;
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast), background var(--transition-fast);
      white-space: nowrap;
      overflow: hidden;
    }
    .theme-btn:hover {
      border-color: var(--color-accent);
      color: var(--color-accent-light);
      background: var(--color-surface2);
    }
    .theme-btn:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .collapsed .theme-btn {
      justify-content: center;
      padding: 6px;
    }
    .sidebar-overlay {
      display: none;
    }
    @media (max-width: 768px) {
      .sidebar {
        translate: -100% 0;
        width: 216px;
        z-index: 200;
        transition: translate var(--transition-mid);
      }
      .sidebar.mobile-open {
        translate: 0 0;
      }
      .sidebar-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        z-index: 199;
        cursor: pointer;
      }
    }
  `]
})
export class SidebarComponent {
  readonly tracker = inject(TrackerService);
  readonly theme = inject(ThemeService);
  readonly palette = inject(PaletteService);

  readonly mobileOpen = input<boolean>(false);
  readonly mobileClose = output<void>();

  readonly collapsed = signal(false);
  readonly sunMoonIcon = SunMoon;
  readonly searchIcon = Search;

  readonly overallProgress = computed(() => {
    const { completed, total } = this.tracker.totalTrackable();
    return total > 0 ? (completed / total) * 100 : 0;
  });

  readonly groups = computed(() => {
    const toggles = this.tracker.sectionToggles();
    const enabled: NavItem[] = [];
    const disabled: NavItem[] = [];
    for (const item of TRACKABLE_ITEMS) {
      if (!item.section || toggles[item.section]) {
        enabled.push(item);
      } else {
        disabled.push(item);
      }
    }
    return [
      { group: 'Overview', items: OVERVIEW_ITEMS },
      { group: 'Enabled', items: enabled },
      ...(disabled.length > 0 ? [{ group: 'Disabled', items: disabled }] : []),
      { group: 'Info', items: INFO_ITEMS },
    ];
  });

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
  }
}
