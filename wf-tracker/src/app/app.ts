import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LucideAngularModule, icons } from 'lucide-angular';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { PinnedBarComponent } from './shared/components/pinned-bar/pinned-bar.component';
import { PaletteService } from './core/services/palette.service';
import { TrackerService } from './core/services/tracker.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, CommandPaletteComponent, PinnedBarComponent, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.control.k)': 'openPalette($event)',
    '(document:keydown.meta.k)': 'openPalette($event)',
  },
  template: `
    <div class="app-shell">
      <app-sidebar [mobileOpen]="mobileMenuOpen()" (mobileClose)="mobileMenuOpen.set(false)" />
      <div class="page-wrap">
        <header class="mobile-header" aria-label="App navigation">
          <button
            type="button"
            class="mobile-menu-btn"
            (click)="mobileMenuOpen.set(true)"
            aria-label="Open navigation menu"
            aria-haspopup="true"
            [attr.aria-expanded]="mobileMenuOpen()"
          >
            <lucide-icon [img]="menuIcon" [size]="20" [strokeWidth]="1.75" aria-hidden="true"></lucide-icon>
          </button>
          <span class="mobile-logo">
            <span class="mobile-logo-wf">WF</span>
            <span class="mobile-logo-text">TRACKER</span>
          </span>
        </header>
        <main class="main-content" [class.has-pinned-bar]="hasPinnedBar()">
          <router-outlet />
        </main>
      </div>
    </div>
    <app-pinned-bar />
    <app-command-palette />
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
    }
    .page-wrap {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      margin-left: 216px;
      transition: margin-left var(--transition-mid);
    }
    .main-content {
      flex: 1;
      padding: 0 36px 48px;
      min-width: 0;
      transition: padding-bottom var(--transition-mid);
    }
    .main-content.has-pinned-bar {
      padding-bottom: 280px;
    }
    .mobile-header {
      display: none;
      align-items: center;
      gap: 12px;
      padding: 0 16px;
      height: 52px;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 150;
      flex-shrink: 0;
    }
    .mobile-menu-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      width: 34px;
      height: 34px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: border-color var(--transition-fast), color var(--transition-fast);
    }
    .mobile-menu-btn:hover {
      border-color: var(--color-accent);
      color: var(--color-accent-light);
    }
    .mobile-menu-btn:focus-visible {
      outline: 2px solid var(--color-accent-light);
      outline-offset: 2px;
    }
    .mobile-logo {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .mobile-logo-wf {
      font-size: 15px;
      font-weight: 800;
      color: var(--color-accent-light);
      letter-spacing: 0.12em;
    }
    .mobile-logo-text {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.18em;
      color: var(--color-text-muted);
    }
    @media (max-width: 768px) {
      .page-wrap {
        margin-left: 0;
      }
      .mobile-header {
        display: flex;
      }
      .main-content {
        padding: 0 16px 48px;
      }
    }
  `]
})
export class App {
  private readonly paletteService = inject(PaletteService);
  private readonly tracker = inject(TrackerService);

  readonly hasPinnedBar = computed(() => this.tracker.settings().pinnedBar.widgets.length > 0);
  readonly mobileMenuOpen = signal(false);
  readonly menuIcon = icons.Menu;

  openPalette(event: Event): void {
    event.preventDefault();
    this.paletteService.open();
  }
}
