import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideAngularModule, icons } from 'lucide-angular';
import { TrackerService } from '../../../core/services/tracker.service';

type LucideIconData = (typeof icons)[keyof typeof icons];

interface NavItem {
  label: string;
  route: string;
  icon: LucideIconData;
  section?: keyof import('../../../core/models/tracker.models').SectionToggles;
}

const {
  LayoutDashboard, ListChecks, Settings, Trophy, Target,
  ScrollText, Sword, Skull, Zap, Sparkles, Layers, FlaskConical, Rocket,
  Gem, ClipboardList, Package, Palette, Archive, Flower2, BookOpen,
  ShoppingBag, Boxes, Component: ComponentIcon, History,
} = icons;

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard',      route: '/dashboard',      icon: LayoutDashboard },
      { label: 'Task Checklist', route: '/task-checklist', icon: ListChecks },
      { label: 'Settings',       route: '/settings',       icon: Settings },
      { label: 'Big Goals',      route: '/big-goals',      icon: Trophy },
      { label: 'Personal Goals', route: '/personal-goals', icon: Target },
    ]
  },
  {
    group: 'Content',
    items: [
      { label: 'Quests',    route: '/quests',    icon: ScrollText,   section: 'quests' },
      { label: 'Gear',      route: '/gear',      icon: Sword,        section: 'gear' },
      { label: 'Lich Gear', route: '/lich-gear', icon: Skull,        section: 'lichGear' },
      { label: 'Incarnon',  route: '/incarnon',  icon: Zap,          section: 'incarnon' },
      { label: 'Arcanes',   route: '/arcanes',   icon: Sparkles,     section: 'arcanes' },
      { label: 'Mods',      route: '/mods',      icon: Layers,       section: 'mods' },
      { label: 'Subsume',   route: '/subsume',   icon: FlaskConical, section: 'subsume' },
      { label: 'Railjack',  route: '/railjack',  icon: Rocket,       section: 'railjack' },
    ]
  },
  {
    group: 'Collection',
    items: [
      { label: 'Relics',       route: '/relics',        icon: Gem,         section: 'relics' },
      { label: 'Blueprints',   route: '/blueprints',    icon: ClipboardList, section: 'blueprints' },
      { label: 'Items',        route: '/items',         icon: Package,     section: 'items' },
      { label: 'Cosmetics',    route: '/cosmetics',     icon: Palette,     section: 'cosmetics' },
      { label: 'Collectable',  route: '/collectable',   icon: Archive,     section: 'collectable' },
      { label: 'Decorations',  route: '/decorations',   icon: Flower2,     section: 'decorations' },
      { label: 'Codex',        route: '/codex',         icon: BookOpen,    section: 'codex' },
      { label: 'Market',       route: '/market',        icon: ShoppingBag, section: 'market' },
      { label: 'Extra',        route: '/extra',         icon: Boxes,       section: 'extra' },
      { label: 'Modular Gear', route: '/modular-gear',  icon: ComponentIcon, section: 'modularGear' },
    ]
  },
  {
    group: 'Info',
    items: [
      { label: 'Version Log', route: '/version-log', icon: History },
    ]
  }
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed()">
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
        @for (group of groups; track group.group) {
          @if (!collapsed()) {
            <div class="nav-group">
              <div class="nav-group-label">{{ group.group }}</div>
            </div>
          }
          @for (item of group.items; track item.route) {
            <a [routerLink]="item.route"
               routerLinkActive="active"
               class="nav-item"
               [title]="collapsed() ? item.label : ''">
              <lucide-icon class="nav-icon" [img]="item.icon" [size]="15" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
              @if (!collapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </a>
          }
        }
      </nav>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 216px;
      min-height: 100vh;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      transition: width var(--transition-mid);
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      overflow-y: auto;
      overflow-x: hidden;
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
    .nav-content {
      flex: 1;
      padding: 6px 0 12px;
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
  `]
})
export class SidebarComponent {
  readonly tracker = inject(TrackerService);

  readonly groups = NAV_GROUPS;
  readonly collapsed = signal(false);

  readonly overallProgress = computed(() => {
    const { completed, total } = this.tracker.totalTrackable();
    return total > 0 ? (completed / total) * 100 : 0;
  });

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
  }
}
