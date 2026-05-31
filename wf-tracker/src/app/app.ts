import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { CommandPaletteComponent } from './shared/components/command-palette/command-palette.component';
import { PaletteService } from './core/services/palette.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, CommandPaletteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.control.k)': 'openPalette($event)',
    '(document:keydown.meta.k)': 'openPalette($event)',
  },
  template: `
    <div class="app-shell">
      <app-sidebar />
      <main class="main-content">
        <router-outlet />
      </main>
    </div>
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
      transition: margin-left var(--transition-mid);
    }
  `]
})
export class App {
  private readonly paletteService = inject(PaletteService);

  openPalette(event: Event): void {
    event.preventDefault();
    this.paletteService.open();
  }
}
