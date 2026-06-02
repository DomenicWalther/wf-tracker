import { Component, ChangeDetectionStrategy, inject, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { PinnedBarComponent } from './shared/components/pinned-bar/pinned-bar.component';
import { PaletteService } from './core/services/palette.service';
import { TrackerService } from './core/services/tracker.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, CommandPaletteComponent, PinnedBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.control.k)': 'openPalette($event)',
    '(document:keydown.meta.k)': 'openPalette($event)',
  },
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="main-content" [class.has-pinned-bar]="hasPinnedBar()">
        <router-outlet />
      </main>
    </div>
    <app-pinned-bar />
    <app-command-palette />
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
    }
    .main-content {
      flex: 1;
      margin-left: 216px;
      padding: 0 36px 48px;
      min-width: 0;
      transition: margin-left var(--transition-mid), padding-bottom var(--transition-mid);
    }
    .main-content.has-pinned-bar {
      padding-bottom: 280px;
    }
  `]
})
export class App {
  private readonly paletteService = inject(PaletteService);
  private readonly tracker = inject(TrackerService);

  readonly hasPinnedBar = computed(() => this.tracker.settings().pinnedBar.widgets.length > 0);

  openPalette(event: Event): void {
    event.preventDefault();
    this.paletteService.open();
  }
}
