import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TrackerService } from '../../../core/services/tracker.service';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  section?: keyof import('../../../core/models/tracker.models').SectionToggles;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: 'Overview',
    items: [
      { label: 'Dashboard', route: '/dashboard', icon: '⊞' },
      { label: 'Settings', route: '/settings', icon: '⚙' },
      { label: 'Big Goals', route: '/big-goals', icon: '★' },
      { label: 'Personal Goals', route: '/personal-goals', icon: '◎' },
    ]
  },
  {
    group: 'Content',
    items: [
      { label: 'Quests', route: '/quests', icon: '◈', section: 'quests' },
      { label: 'Gear', route: '/gear', icon: '⚔', section: 'gear' },
      { label: 'Lich Gear', route: '/lich-gear', icon: '☠', section: 'lichGear' },
      { label: 'Incarnon', route: '/incarnon', icon: '◉', section: 'incarnon' },
      { label: 'Arcanes', route: '/arcanes', icon: '✦', section: 'arcanes' },
      { label: 'Mods', route: '/mods', icon: '▣', section: 'mods' },
      { label: 'Subsume', route: '/subsume', icon: '⬡', section: 'subsume' },
      { label: 'Railjack', route: '/railjack', icon: '◆', section: 'railjack' },
    ]
  },
  {
    group: 'Collection',
    items: [
      { label: 'Relics', route: '/relics', icon: '◇', section: 'relics' },
      { label: 'Blueprints', route: '/blueprints', icon: '📋', section: 'blueprints' },
      { label: 'Items', route: '/items', icon: '◻', section: 'items' },
      { label: 'Cosmetics', route: '/cosmetics', icon: '◈', section: 'cosmetics' },
      { label: 'Collectable', route: '/collectable', icon: '⊕', section: 'collectable' },
      { label: 'Decorations', route: '/decorations', icon: '⊞', section: 'decorations' },
      { label: 'Codex', route: '/codex', icon: '⊟', section: 'codex' },
      { label: 'Market', route: '/market', icon: '◎', section: 'market' },
      { label: 'Extra', route: '/extra', icon: '⊗', section: 'extra' },
      { label: 'Modular Gear', route: '/modular-gear', icon: '⬢', section: 'modularGear' },
    ]
  },
  {
    group: 'Info',
    items: [
      { label: 'Version Log', route: '/version-log', icon: '◷' },
    ]
  }
];

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
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
        <button class="collapse-btn" (click)="toggleCollapsed()" title="Toggle sidebar">
          {{ collapsed() ? '›' : '‹' }}
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
              <span class="nav-icon">{{ item.icon }}</span>
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
      width: 220px;
      min-height: 100vh;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      transition: width 0.2s ease;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .sidebar.collapsed {
      width: 50px;
    }
    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 12px;
      border-bottom: 1px solid var(--color-border);
      min-height: 60px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .logo-wf {
      font-size: 18px;
      font-weight: 800;
      color: var(--color-gold);
      letter-spacing: 0.1em;
    }
    .logo-text {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: var(--color-text-muted);
    }
    .collapse-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .collapse-btn:hover {
      border-color: var(--color-gold);
      color: var(--color-gold);
    }
    .overall-progress {
      padding: 12px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .progress-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      margin-bottom: 6px;
    }
    .progress-value {
      font-size: 12px;
      color: var(--color-gold);
      text-align: right;
      margin-top: 4px;
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
      padding: 8px 0;
    }
    .nav-group {
      padding: 12px 16px 4px;
    }
    .nav-group-label {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 16px;
      color: var(--color-text);
      text-decoration: none;
      font-size: 13px;
      border-left: 2px solid transparent;
      transition: all 0.15s ease;
    }
    .nav-item:hover {
      background: var(--color-surface2);
      color: var(--color-gold-light);
    }
    .nav-item.active {
      border-left-color: var(--color-gold);
      background: var(--color-surface2);
      color: var(--color-gold);
    }
    .nav-icon {
      font-size: 14px;
      width: 20px;
      text-align: center;
      flex-shrink: 0;
    }
    .nav-label {
      white-space: nowrap;
      overflow: hidden;
    }
    .collapsed .nav-item {
      padding: 10px;
      justify-content: center;
    }
    .collapsed .nav-item.active {
      border-left-color: transparent;
      background: var(--color-surface2);
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
