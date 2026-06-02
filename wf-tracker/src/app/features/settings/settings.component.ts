import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { TrackerSettings, SectionToggles, PinnedWidget } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header title="SETTINGS" description="Customise your tracking experience. Settings affect what counts towards your completion percentage everywhere." />

      <div class="settings-grid">

        <!-- GLOBAL -->
        <div class="settings-card" [formGroup]="settingsForm">
          <div class="settings-card-title">Account Type</div>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" formControlName="isFounder" />
            <div class="setting-info">
              <span class="setting-label">Founder</span>
              <span class="setting-desc">Unlock tracking for founder-only gear (Excalibur Prime etc.)</span>
            </div>
          </label>
          <label class="setting-row">
            <input type="checkbox" class="wf-checkbox" formControlName="includeConclave" />
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
          <div [formGroup]="togglesForm">
            @for (toggle of sectionToggleList; track toggle.key) {
              <label class="setting-row">
                <input type="checkbox" class="wf-checkbox" [formControlName]="toggle.key" />
                <span class="setting-label">{{ toggle.label }}</span>
              </label>
            }
          </div>
        </div>

        <!-- GEAR -->
        <div class="settings-card">
          <div class="settings-card-title">Gear Tracking</div>
          <div class="settings-note">Additional columns tracked per gear item</div>
          <div [formGroup]="gearGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="primeOnlyGear" />
              <div class="setting-info">
                <span class="setting-label">Prime Only</span>
                <span class="setting-desc">Group variant families (Prime / Kuva / Tenet / Vandal / Wraith…) into one row: track Mastery per variant, but share a single set of upgrade columns since you only fully build one</span>
              </div>
            </label>
            @for (opt of gearOptions; track opt.key) {
              <label class="setting-row">
                <input type="checkbox" class="wf-checkbox" [formControlName]="opt.key" />
                <div class="setting-info">
                  <span class="setting-label">{{ opt.label }}</span>
                  <span class="setting-desc">{{ opt.desc }}</span>
                </div>
              </label>
            }
          </div>
        </div>

        <!-- INCARNON -->
        <div class="settings-card">
          <div class="settings-card-title">Incarnon</div>
          <div [formGroup]="incarnonGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="completionist" />
              <div class="setting-info">
                <span class="setting-label">Incarnon Completionist</span>
                <span class="setting-desc">Track adapters on all weapon variants, not just the primary one</span>
              </div>
            </label>
          </div>
        </div>

        <!-- ARCANES -->
        <div class="settings-card">
          <div class="settings-card-title">Arcanes</div>
          <div [formGroup]="arcaneGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="psycho" />
              <div class="setting-info">
                <span class="setting-label">Arcane Psycho</span>
                <span class="setting-desc">Collect 1 of every arcane rank (Base, R1, R2, R3, R4)</span>
              </div>
            </label>
          </div>
        </div>

        <!-- MODS -->
        <div class="settings-card">
          <div class="settings-card-title">Mods</div>
          <div [formGroup]="modGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="hoarder" />
              <div class="setting-info">
                <span class="setting-label">Mod Hoarder</span>
                <span class="setting-desc">Track a copy of every mod at each rank level</span>
              </div>
            </label>
          </div>
        </div>

        <!-- RAILJACK -->
        <div class="settings-card">
          <div class="settings-card-title">Railjack</div>
          <div [formGroup]="railjackGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="partHoarder" />
              <div class="setting-info">
                <span class="setting-label">RJ Part Hoarder</span>
                <span class="setting-desc">Track all Railjack parts with best stats</span>
              </div>
            </label>
          </div>
        </div>

        <!-- RELICS -->
        <div class="settings-card">
          <div class="settings-card-title">Relics</div>
          <div [formGroup]="relicGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="hoarder" />
              <div class="setting-info">
                <span class="setting-label">Relic Hoarder</span>
                <span class="setting-desc">Track Exceptional, Flawless, and Radiant variants</span>
              </div>
            </label>
          </div>
        </div>

        <!-- BLUEPRINTS -->
        <div class="settings-card">
          <div class="settings-card-title">Blueprints</div>
          <div [formGroup]="blueprintGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="hoarder" />
              <div class="setting-info">
                <span class="setting-label">BP Hoarder</span>
                <span class="setting-desc">Include old/impossible-to-get blueprints</span>
              </div>
            </label>
          </div>
        </div>

        <!-- COSMETICS -->
        <div class="settings-card">
          <div class="settings-card-title">Cosmetics</div>
          <div [formGroup]="cosmeticsGroup">
            @for (opt of cosmeticsOptions; track opt.key) {
              <label class="setting-row">
                <input type="checkbox" class="wf-checkbox" [formControlName]="opt.key" />
                <div class="setting-info">
                  <span class="setting-label">{{ opt.label }}</span>
                  <span class="setting-desc">{{ opt.desc }}</span>
                </div>
              </label>
            }
          </div>
        </div>

        <!-- COLLECTABLE -->
        <div class="settings-card">
          <div class="settings-card-title">Collectables</div>
          <div [formGroup]="collectableGroup">
            @for (opt of collectableOptions; track opt.key) {
              <label class="setting-row">
                <input type="checkbox" class="wf-checkbox" [formControlName]="opt.key" />
                <div class="setting-info">
                  <span class="setting-label">{{ opt.label }}</span>
                  <span class="setting-desc">{{ opt.desc }}</span>
                </div>
              </label>
            }
          </div>
        </div>

        <!-- DECORATIONS -->
        <div class="settings-card">
          <div class="settings-card-title">Decorations</div>
          <div [formGroup]="decorationsGroup">
            @for (opt of decorationsOptions; track opt.key) {
              <label class="setting-row">
                <input type="checkbox" class="wf-checkbox" [formControlName]="opt.key" />
                <div class="setting-info">
                  <span class="setting-label">{{ opt.label }}</span>
                  <span class="setting-desc">{{ opt.desc }}</span>
                </div>
              </label>
            }
          </div>
        </div>

        <!-- CODEX -->
        <div class="settings-card">
          <div class="settings-card-title">Codex</div>
          <div [formGroup]="codexGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="old" />
              <div class="setting-info">
                <span class="setting-label">Include Old Scans</span>
                <span class="setting-desc">Include now-impossible codex scans</span>
              </div>
            </label>
          </div>
        </div>

        <!-- MARKET -->
        <div class="settings-card">
          <div class="settings-card-title">Market</div>
          <div [formGroup]="marketGroup">
            <label class="setting-row">
              <input type="checkbox" class="wf-checkbox" formControlName="extra" />
              <div class="setting-info">
                <span class="setting-label">Extra Market Items</span>
                <span class="setting-desc">Tennocon exclusive, event exclusive or time-locked items</span>
              </div>
            </label>
          </div>
        </div>

        <!-- PINNED BAR -->
        <div class="settings-card full-width">
          <div class="settings-card-title">Pinned Bar</div>
          <div class="settings-note">Pin widgets to a bar at the bottom of the screen so they're always visible.</div>

          <div class="pinned-widgets-section">
            <div class="settings-sub-title">Widgets</div>
            @for (widget of pinnedWidgetOptions; track widget.id) {
              <label class="setting-row">
                <input
                  type="checkbox"
                  class="wf-checkbox"
                  [checked]="isPinnedWidgetEnabled(widget.id)"
                  (change)="togglePinnedWidget(widget.id)"
                />
                <div class="setting-info">
                  <span class="setting-label">{{ widget.label }}</span>
                  <span class="setting-desc">{{ widget.desc }}</span>
                </div>
              </label>
            }
          </div>

          @if (isPinnedWidgetEnabled('world-state')) {
            <div class="pinned-cycles-section">
              <div class="settings-sub-title">Hidden Cycles</div>
              <div class="settings-note">Uncheck cycles you don't want to see in the pinned bar.</div>
              @for (cycle of allCycles; track cycle) {
                <label class="setting-row">
                  <input
                    type="checkbox"
                    class="wf-checkbox"
                    [checked]="!isCycleHidden(cycle)"
                    (change)="toggleHiddenCycle(cycle)"
                  />
                  <span class="setting-label">{{ cycle }}</span>
                </label>
              }
            </div>
          }
        </div>

        <!-- DATA MANAGEMENT -->
        <div class="settings-card full-width">
          <div class="settings-card-title">Data Management</div>
          <div class="data-actions">
            <button type="button" class="action-btn" (click)="exportData()">Export Progress</button>
            <label class="action-btn" style="cursor:pointer">
              Import Progress
              <input #fileInput type="file" accept=".json" style="display:none" (change)="onFileSelected(fileInput)" />
            </label>
            <button type="button" class="action-btn danger" (click)="confirmReset()">Reset All Progress</button>
          </div>
          @if (importError()) {
            <div class="import-error" role="alert">{{ importError() }}</div>
          }
          @if (importSuccess()) {
            <div class="import-success" role="status">Import successful! Reloading…</div>
          }
          @if (showResetConfirm()) {
            <div class="confirm-box">
              <p>Are you sure? This will permanently delete all your tracked progress.</p>
              <div class="confirm-actions">
                <button type="button" class="action-btn danger" (click)="resetAll()">Yes, Reset Everything</button>
                <button type="button" class="action-btn" (click)="showResetConfirm.set(false)">Cancel</button>
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
    .action-btn:hover { background: var(--color-gold); color: var(--color-bg); }
    .action-btn.danger { border-color: var(--color-red); color: var(--color-red); }
    .action-btn.danger:hover { background: var(--color-red); color: white; }
    .import-error {
      font-size: 12px;
      color: var(--color-red);
      margin-top: 8px;
    }
    .import-success {
      font-size: 12px;
      color: #4caf50;
      margin-top: 8px;
    }
    .settings-sub-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin: 10px 0 6px;
    }
    .pinned-widgets-section,
    .pinned-cycles-section { margin-bottom: 4px; }
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

  showResetConfirm = signal(false);
  importError = signal('');
  importSuccess = signal(false);

  // ─── Build FormGroups from current service state ──────────────────────────

  private buildBoolGroup(obj: object): FormGroup {
    const controls: Record<string, FormControl<boolean>> = {};
    for (const [key, value] of Object.entries(obj)) {
      controls[key] = new FormControl(value as boolean, { nonNullable: true });
    }
    return new FormGroup(controls);
  }

  readonly gearGroup = this.buildBoolGroup(this.tracker.settings().gear);
  readonly incarnonGroup = this.buildBoolGroup(this.tracker.settings().incarnon);
  readonly arcaneGroup = this.buildBoolGroup(this.tracker.settings().arcane);
  readonly modGroup = this.buildBoolGroup(this.tracker.settings().mod);
  readonly railjackGroup = this.buildBoolGroup(this.tracker.settings().railjack);
  readonly relicGroup = this.buildBoolGroup(this.tracker.settings().relic);
  readonly blueprintGroup = this.buildBoolGroup(this.tracker.settings().blueprint);
  readonly cosmeticsGroup = this.buildBoolGroup(this.tracker.settings().cosmetics);
  readonly collectableGroup = this.buildBoolGroup(this.tracker.settings().collectable);
  readonly decorationsGroup = this.buildBoolGroup(this.tracker.settings().decorations);
  readonly codexGroup = this.buildBoolGroup(this.tracker.settings().codex);
  readonly marketGroup = this.buildBoolGroup(this.tracker.settings().market);

  readonly settingsForm = new FormGroup({
    isFounder: new FormControl(this.tracker.settings().isFounder, { nonNullable: true }),
    includeConclave: new FormControl(this.tracker.settings().includeConclave, { nonNullable: true }),
    gear: this.gearGroup,
    incarnon: this.incarnonGroup,
    arcane: this.arcaneGroup,
    mod: this.modGroup,
    railjack: this.railjackGroup,
    relic: this.relicGroup,
    blueprint: this.blueprintGroup,
    cosmetics: this.cosmeticsGroup,
    collectable: this.collectableGroup,
    decorations: this.decorationsGroup,
    codex: this.codexGroup,
    market: this.marketGroup,
  });

  readonly togglesForm = this.buildBoolGroup(this.tracker.sectionToggles());

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
    { key: 'exilusAdapter' as const, label: 'Exilus Adapter', desc: 'Exilus adapter on weapons (primary, secondary, melee)' },
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

  readonly pinnedWidgetOptions: { id: PinnedWidget; label: string; desc: string }[] = [
    { id: 'world-state',    label: 'World State',    desc: 'Open-world cycle timers (Cetus, Orb Vallis, etc.)' },
    { id: 'task-checklist', label: 'Task Checklist', desc: 'Scrollable list of incomplete daily and weekly tasks' },
  ];

  readonly allCycles = ['Cetus', 'Orb Vallis', 'Cambion Drift', 'Earth'];

  readonly decorationsOptions = [
    { key: 'primeAccess' as const, label: 'Prime Access', desc: 'PA pack decorations' },
    { key: 'events' as const, label: 'Events', desc: 'Event and operation rewards' },
    { key: 'nightwave' as const, label: 'Nightwave', desc: 'Nightwave pool decorations' },
    { key: 'old' as const, label: 'Old', desc: 'Decorations lost to time' },
    { key: 'extra' as const, label: 'Extra (Tennocon)', desc: 'Tennocon and special decorations' },
    { key: 'founder' as const, label: 'Founder', desc: 'Founder-exclusive decorations' },
  ];

  constructor() {
    this.settingsForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      const pinnedBar = this.tracker.settings().pinnedBar;
      this.tracker.updateSettings({ ...this.settingsForm.getRawValue() as TrackerSettings, pinnedBar });
    });
    this.togglesForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.tracker.updateSectionToggles(this.togglesForm.getRawValue() as SectionToggles);
    });
  }

  exportData(): void {
    const json = this.tracker.exportState();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wf-tracker-progress.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  onFileSelected(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = reader.result as string;
        JSON.parse(json); // validate before importing
        this.tracker.importState(json);
        this.importError.set('');
        this.importSuccess.set(true);
        setTimeout(() => window.location.reload(), 800);
      } catch {
        this.importError.set('Invalid file. Please select a valid wf-tracker export.');
        this.importSuccess.set(false);
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  isPinnedWidgetEnabled(widget: PinnedWidget): boolean {
    return this.tracker.settings().pinnedBar.widgets.includes(widget);
  }

  togglePinnedWidget(widget: PinnedWidget): void {
    const current = this.tracker.settings().pinnedBar;
    const widgets = current.widgets.includes(widget)
      ? current.widgets.filter(w => w !== widget)
      : [...current.widgets, widget];
    this.tracker.updatePinnedBarSettings({ ...current, widgets });
  }

  isCycleHidden(cycle: string): boolean {
    return this.tracker.settings().pinnedBar.hiddenCycles.includes(cycle);
  }

  toggleHiddenCycle(cycle: string): void {
    const current = this.tracker.settings().pinnedBar;
    const hiddenCycles = current.hiddenCycles.includes(cycle)
      ? current.hiddenCycles.filter(c => c !== cycle)
      : [...current.hiddenCycles, cycle];
    this.tracker.updatePinnedBarSettings({ ...current, hiddenCycles });
  }

  confirmReset(): void {
    this.showResetConfirm.set(true);
  }

  resetAll(): void {
    localStorage.clear();
    window.location.reload();
  }
}
