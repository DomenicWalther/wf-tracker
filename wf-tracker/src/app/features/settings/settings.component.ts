import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { TrackerSettings, SectionToggles } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header title="SETTINGS" description="Customise your tracking experience. Settings affect what counts towards your completion percentage everywhere." />

      <div class="settings-grid">

        <!-- GLOBAL -->
        <div class="settings-card">
          <div class="settings-card-title">Account Type</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.isFounder" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Founder</span>
              <span class="setting-desc">Unlock tracking for founder-only gear (Excalibur Prime etc.)</span>
            </div>
          </label>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.includeConclave" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Include Conclave</span>
              <span class="setting-desc">Include conclave collections in tracking</span>
            </div>
          </label>
        </div>

        <!-- SECTION TOGGLES -->
        <div class="settings-card">
          <div class="settings-card-title">Section Toggles</div>
          <div class="settings-note">Enable or disable entire sections from counting towards overall %</div>
          @for (toggle of sectionToggleList; track toggle.key) {
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" [(ngModel)]="toggles[toggle.key]" (ngModelChange)="saveToggles()" />
              <span class="setting-label">{{ toggle.label }}</span>
            </label>
          }
        </div>

        <!-- GEAR -->
        <div class="settings-card">
          <div class="settings-card-title">Gear Tracking</div>
          <div class="settings-note">Additional columns tracked per gear item</div>
          @for (opt of gearOptions; track opt.key) {
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.gear[opt.key]" (ngModelChange)="save()" />
              <div class="setting-info">
                <span class="setting-label">{{ opt.label }}</span>
                <span class="setting-desc">{{ opt.desc }}</span>
              </div>
            </label>
          }
        </div>

        <!-- INCARNON -->
        <div class="settings-card">
          <div class="settings-card-title">Incarnon</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.incarnon.completionist" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Incarnon Completionist</span>
              <span class="setting-desc">Track adapters on all weapon variants, not just the primary one</span>
            </div>
          </label>
        </div>

        <!-- ARCANES -->
        <div class="settings-card">
          <div class="settings-card-title">Arcanes</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.arcane.psycho" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Arcane Psycho</span>
              <span class="setting-desc">Collect 1 of every arcane rank (Base, R1, R2, R3, R4)</span>
            </div>
          </label>
        </div>

        <!-- MODS -->
        <div class="settings-card">
          <div class="settings-card-title">Mods</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.mod.hoarder" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Mod Hoarder</span>
              <span class="setting-desc">Track a copy of every mod at each rank level</span>
            </div>
          </label>
        </div>

        <!-- RAILJACK -->
        <div class="settings-card">
          <div class="settings-card-title">Railjack</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.railjack.partHoarder" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">RJ Part Hoarder</span>
              <span class="setting-desc">Track all Railjack parts with best stats</span>
            </div>
          </label>
        </div>

        <!-- RELICS -->
        <div class="settings-card">
          <div class="settings-card-title">Relics</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.relic.hoarder" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Relic Hoarder</span>
              <span class="setting-desc">Track Exceptional, Flawless, and Radiant variants</span>
            </div>
          </label>
        </div>

        <!-- BLUEPRINTS -->
        <div class="settings-card">
          <div class="settings-card-title">Blueprints</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.blueprint.hoarder" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">BP Hoarder</span>
              <span class="setting-desc">Include old/impossible-to-get blueprints</span>
            </div>
          </label>
        </div>

        <!-- COSMETICS -->
        <div class="settings-card">
          <div class="settings-card-title">Cosmetics</div>
          @for (opt of cosmeticsOptions; track opt.key) {
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.cosmetics[opt.key]" (ngModelChange)="save()" />
              <div class="setting-info">
                <span class="setting-label">{{ opt.label }}</span>
                <span class="setting-desc">{{ opt.desc }}</span>
              </div>
            </label>
          }
        </div>

        <!-- COLLECTABLE -->
        <div class="settings-card">
          <div class="settings-card-title">Collectables</div>
          @for (opt of collectableOptions; track opt.key) {
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.collectable[opt.key]" (ngModelChange)="save()" />
              <div class="setting-info">
                <span class="setting-label">{{ opt.label }}</span>
                <span class="setting-desc">{{ opt.desc }}</span>
              </div>
            </label>
          }
        </div>

        <!-- DECORATIONS -->
        <div class="settings-card">
          <div class="settings-card-title">Decorations</div>
          @for (opt of decorationsOptions; track opt.key) {
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.decorations[opt.key]" (ngModelChange)="save()" />
              <div class="setting-info">
                <span class="setting-label">{{ opt.label }}</span>
                <span class="setting-desc">{{ opt.desc }}</span>
              </div>
            </label>
          }
        </div>

        <!-- CODEX -->
        <div class="settings-card">
          <div class="settings-card-title">Codex</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.codex.old" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Include Old Scans</span>
              <span class="setting-desc">Include now-impossible codex scans</span>
            </div>
          </label>
        </div>

        <!-- MARKET -->
        <div class="settings-card">
          <div class="settings-card-title">Market</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" [(ngModel)]="settings.market.extra" (ngModelChange)="save()" />
            <div class="setting-info">
              <span class="setting-label">Extra Market Items</span>
              <span class="setting-desc">Tennocon exclusive, event exclusive or time-locked items</span>
            </div>
          </label>
        </div>

        <!-- DATA MANAGEMENT -->
        <div class="settings-card full-width">
          <div class="settings-card-title">Data Management</div>
          <div class="data-actions">
            <button class="action-btn" (click)="exportData()">Export Progress</button>
            <button class="action-btn danger" (click)="confirmReset()">Reset All Progress</button>
          </div>
          @if (exportedJson()) {
            <textarea class="export-area" readonly [value]="exportedJson()"></textarea>
          }
          @if (showResetConfirm()) {
            <div class="confirm-box">
              <p>Are you sure? This will permanently delete all your tracked progress.</p>
              <div class="confirm-actions">
                <button class="action-btn danger" (click)="resetAll()">Yes, Reset Everything</button>
                <button class="action-btn" (click)="showResetConfirm.set(false)">Cancel</button>
              </div>
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 1100px; }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 12px;
    }
    .settings-card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 16px;
    }
    .settings-card.full-width { grid-column: 1 / -1; }
    .settings-card-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-gold);
      margin-bottom: 12px;
    }
    .settings-note {
      font-size: 11px;
      color: var(--color-text-muted);
      margin-bottom: 10px;
    }
    .setting-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 6px 0;
      cursor: pointer;
      border-bottom: 1px solid var(--color-border);
    }
    .setting-row:last-child { border-bottom: none; }
    .setting-row:hover { background: transparent; }
    .setting-info { display: flex; flex-direction: column; gap: 1px; }
    .setting-label { font-size: 13px; color: var(--color-text); }
    .setting-desc { font-size: 11px; color: var(--color-text-muted); }
    .data-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
    .action-btn {
      padding: 7px 16px;
      border-radius: 4px;
      border: 1px solid var(--color-gold);
      background: transparent;
      color: var(--color-gold);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-btn:hover { background: var(--color-gold); color: #0a0a0f; }
    .action-btn.danger { border-color: var(--color-red); color: var(--color-red); }
    .action-btn.danger:hover { background: var(--color-red); color: white; }
    .export-area {
      width: 100%;
      height: 120px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 11px;
      padding: 8px;
      border-radius: 4px;
      resize: vertical;
    }
    .confirm-box {
      background: var(--color-surface2);
      border: 1px solid var(--color-red);
      border-radius: 6px;
      padding: 12px;
      margin-top: 8px;
    }
    .confirm-box p { font-size: 13px; color: var(--color-text); margin: 0 0 10px; }
    .confirm-actions { display: flex; gap: 8px; }
  `]
})
export class SettingsComponent {
  private readonly tracker = inject(TrackerService);

  settings: TrackerSettings = { ...this.tracker.settings() };
  toggles: SectionToggles = { ...this.tracker.sectionToggles() };

  exportedJson = signal('');
  showResetConfirm = signal(false);

  readonly sectionToggleList = [
    { key: 'quests' as const, label: 'Quests' },
    { key: 'gear' as const, label: 'Gear' },
    { key: 'lichGear' as const, label: 'Lich Gear' },
    { key: 'incarnon' as const, label: 'Incarnon' },
    { key: 'arcanes' as const, label: 'Arcanes' },
    { key: 'mods' as const, label: 'Mods' },
    { key: 'subsume' as const, label: 'Subsume' },
    { key: 'railjack' as const, label: 'Railjack' },
    { key: 'relics' as const, label: 'Relics' },
    { key: 'blueprints' as const, label: 'Blueprints' },
    { key: 'items' as const, label: 'Items' },
    { key: 'cosmetics' as const, label: 'Cosmetics' },
    { key: 'collectable' as const, label: 'Collectable' },
    { key: 'decorations' as const, label: 'Decorations' },
    { key: 'codex' as const, label: 'Codex' },
    { key: 'market' as const, label: 'Market' },
    { key: 'extra' as const, label: 'Extra' },
    { key: 'modularGear' as const, label: 'Modular Gear (Legacy)' },
  ];

  readonly gearOptions = [
    { key: 'reactor' as const, label: 'Reactor / Catalyst', desc: 'Track potato on all gear' },
    { key: 'exilus' as const, label: 'Exilus Mod', desc: 'Track exilus adapter on all gear' },
    { key: 'shards' as const, label: '5 Shards', desc: 'Track 5 archon shards in each frame' },
    { key: 'tauForged' as const, label: 'Tau-Forged Shards', desc: 'All shards must be tau-forged' },
    { key: 'arcaneAdapter' as const, label: 'Arcane Adapter', desc: 'Arcane adapter on all gear' },
    { key: 'maxBuild' as const, label: 'Max Build', desc: 'Min-maxed build on all gear' },
    { key: 'auraForma' as const, label: 'Aura Forma', desc: 'Aura forma on all frames' },
    { key: 'stanceForma' as const, label: 'Stance Forma', desc: 'Stance forma on all melee' },
    { key: 'ampArcaneAdapter' as const, label: 'Amp Arcane Adapter', desc: 'Arcane adapter on all amps' },
    { key: 'lens' as const, label: 'Max Lens', desc: 'Best focus lens on all gear' },
  ];

  readonly cosmeticsOptions = [
    { key: 'prime' as const, label: 'Prime Access', desc: 'Accessories from PA packs' },
    { key: 'consoleExclusive' as const, label: 'Console Exclusives', desc: 'Platform-exclusive items (suggested off)' },
    { key: 'tennogen' as const, label: 'Tennogen', desc: 'Community-created paid cosmetics' },
    { key: 'steamItems' as const, label: 'Steam Items', desc: 'Warframe Steam exclusive skins' },
    { key: 'nightwave' as const, label: 'Nightwave', desc: 'Items from Nightwave reward pool' },
    { key: 'old' as const, label: 'Old Items', desc: 'Items no longer obtainable' },
    { key: 'extra' as const, label: 'Extra (Tennocon etc)', desc: 'Very rare and special items' },
    { key: 'founder' as const, label: 'Founder Items', desc: 'Founder-exclusive cosmetics' },
  ];

  readonly collectableOptions = [
    { key: 'eventLocked' as const, label: 'Event Locked', desc: 'Event-limited collectables' },
    { key: 'old' as const, label: 'Old Collectables', desc: 'Stream drops, old promo codes etc.' },
    { key: 'prime' as const, label: 'Prime Collectables', desc: 'Primed collectables' },
    { key: 'consoleExclusive' as const, label: 'Console Exclusives', desc: 'Console-only collectables' },
    { key: 'extra' as const, label: 'Extra', desc: 'Heavily restricted items' },
  ];

  readonly decorationsOptions = [
    { key: 'primeAccess' as const, label: 'Prime Access', desc: 'PA pack decorations' },
    { key: 'events' as const, label: 'Events', desc: 'Event and operation rewards' },
    { key: 'nightwave' as const, label: 'Nightwave', desc: 'Nightwave pool decorations' },
    { key: 'old' as const, label: 'Old', desc: 'Decorations lost to time' },
    { key: 'extra' as const, label: 'Extra (Tennocon)', desc: 'Tennocon and special decorations' },
    { key: 'founder' as const, label: 'Founder', desc: 'Founder-exclusive decorations' },
  ];

  save(): void {
    this.tracker.updateSettings({ ...this.settings });
  }

  saveToggles(): void {
    this.tracker.updateSectionToggles({ ...this.toggles });
  }

  exportData(): void {
    this.exportedJson.set(this.tracker.exportState());
  }

  confirmReset(): void {
    this.showResetConfirm.set(true);
  }

  resetAll(): void {
    localStorage.clear();
    window.location.reload();
  }
}
