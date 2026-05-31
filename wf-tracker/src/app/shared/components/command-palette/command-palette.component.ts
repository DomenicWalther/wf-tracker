import {
  Component, inject, signal, computed, ChangeDetectionStrategy,
  ViewChild, ElementRef, effect, afterNextRender
} from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { TrackerService } from '../../../core/services/tracker.service';
import { PaletteService } from '../../../core/services/palette.service';
import { TrackerData } from '../../../core/models/tracker.models';

type EntryType = 'item' | 'nav' | 'action';

interface IndexEntry {
  type: EntryType;
  label: string;
  sublabel: string;
  key?: string;
  route?: string;
  actionId?: string;
}

interface ResultEntry extends IndexEntry {
  checked: boolean;
}

const NAV_ENTRIES: IndexEntry[] = [
  { type: 'nav', label: 'Dashboard', sublabel: 'Go to section', route: '/dashboard' },
  { type: 'nav', label: 'Quests', sublabel: 'Go to section', route: '/quests' },
  { type: 'nav', label: 'Gear', sublabel: 'Go to section', route: '/gear' },
  { type: 'nav', label: 'Lich Gear', sublabel: 'Go to section', route: '/lich-gear' },
  { type: 'nav', label: 'Incarnon', sublabel: 'Go to section', route: '/incarnon' },
  { type: 'nav', label: 'Arcanes', sublabel: 'Go to section', route: '/arcanes' },
  { type: 'nav', label: 'Mods', sublabel: 'Go to section', route: '/mods' },
  { type: 'nav', label: 'Subsume', sublabel: 'Go to section', route: '/subsume' },
  { type: 'nav', label: 'Railjack', sublabel: 'Go to section', route: '/railjack' },
  { type: 'nav', label: 'Relics', sublabel: 'Go to section', route: '/relics' },
  { type: 'nav', label: 'Blueprints', sublabel: 'Go to section', route: '/blueprints' },
  { type: 'nav', label: 'Items', sublabel: 'Go to section', route: '/items' },
  { type: 'nav', label: 'Cosmetics', sublabel: 'Go to section', route: '/cosmetics' },
  { type: 'nav', label: 'Collectable', sublabel: 'Go to section', route: '/collectable' },
  { type: 'nav', label: 'Decorations', sublabel: 'Go to section', route: '/decorations' },
  { type: 'nav', label: 'Codex', sublabel: 'Go to section', route: '/codex' },
  { type: 'nav', label: 'Market', sublabel: 'Go to section', route: '/market' },
  { type: 'nav', label: 'Extra', sublabel: 'Go to section', route: '/extra' },
  { type: 'nav', label: 'Modular Gear', sublabel: 'Go to section', route: '/modular-gear' },
  { type: 'nav', label: 'Task Checklist', sublabel: 'Go to section', route: '/task-checklist' },
  { type: 'nav', label: 'Goals', sublabel: 'Go to section', route: '/goals' },
  { type: 'nav', label: 'Settings', sublabel: 'Go to section', route: '/settings' },
  { type: 'nav', label: 'Version Log', sublabel: 'Go to section', route: '/version-log' },
];

const ACTION_ENTRIES: IndexEntry[] = [
  { type: 'action', label: 'Export data', sublabel: 'Download backup JSON', actionId: 'export' },
];

function fuzzyScore(label: string, query: string): number {
  if (!query) return 0;
  const l = label.toLowerCase();
  if (l === query) return 100;
  if (l.startsWith(query)) return 80;
  const words = l.split(/[\s\-_()[\]]/);
  if (words.some(w => w.startsWith(query))) return 60;
  if (l.includes(query)) return 40;
  return 0;
}

function buildItemIndex(data: TrackerData | undefined): IndexEntry[] {
  if (!data) return [];
  const out: IndexEntry[] = [];

  for (const name of data.quests ?? []) {
    out.push({ type: 'item', label: name, sublabel: 'Quests', key: 'quest:' + name, route: '/quests' });
  }

  const gearSections: [string, string][] = [
    ['warframes', 'Gear — Warframes'], ['primaries', 'Gear — Primaries'],
    ['secondaries', 'Gear — Secondaries'], ['melees', 'Gear — Melees'],
    ['companions', 'Gear — Companions'], ['archwings', 'Gear — Archwings'],
    ['archwingWeapons', 'Gear — Archwing Weapons'], ['extras', 'Gear — Extra'],
  ];
  for (const [sKey, sublabel] of gearSections) {
    for (const item of data.gear?.[sKey] ?? []) {
      out.push({ type: 'item', label: item.name, sublabel, key: `gear:${item.name}:mastery`, route: '/gear' });
    }
  }

  for (const [group, items] of Object.entries(data.lichGear ?? {})) {
    const g = group.replace(/\b\w/g, c => c.toUpperCase());
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Lich Gear — ${g}`, key: 'lich:' + name, route: '/lich-gear' });
    }
  }

  for (const entry of data.incarnon ?? []) {
    out.push({ type: 'item', label: entry.name, sublabel: 'Incarnon', key: `incarnon:family:${entry.name}:earned`, route: '/incarnon' });
  }

  for (const [group, items] of Object.entries(data.arcanes ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Arcanes — ${group}`, key: 'arcane:' + name, route: '/arcanes' });
    }
  }

  for (const mod of data.mods ?? []) {
    out.push({ type: 'item', label: mod.name, sublabel: `Mods — ${mod.category}`, key: 'mod:' + mod.name, route: '/mods' });
  }

  for (const entry of data.subsume ?? []) {
    out.push({ type: 'item', label: `${entry.warframe} — ${entry.ability}`, sublabel: 'Subsume', key: 'subsume:' + entry.warframe, route: '/subsume' });
  }

  for (const name of data.railjack?.intrinsics ?? []) {
    out.push({ type: 'item', label: name, sublabel: 'Railjack — Intrinsics', key: 'rj:intr:' + name, route: '/railjack' });
  }
  for (const c of data.railjack?.components ?? []) {
    const label = `${c.house} ${c.component} (${c.bonus})`;
    out.push({ type: 'item', label, sublabel: 'Railjack — Components', key: `rj:comp:${c.house}:${c.component}:${c.bonus}`, route: '/railjack' });
  }

  for (const [tier, items] of Object.entries(data.relics ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Relics — ${tier}`, key: 'relic:' + name, route: '/relics' });
    }
  }

  for (const [vendor, cats] of Object.entries(data.blueprints ?? {})) {
    for (const items of Object.values(cats)) {
      for (const item of items) {
        out.push({ type: 'item', label: item.name, sublabel: `Blueprints — ${vendor}`, key: 'bp:' + item.name, route: '/blueprints' });
      }
    }
  }

  for (const [section, items] of Object.entries(data.items ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Items — ${section}`, key: 'item:' + name, route: '/items' });
    }
  }

  for (const [section, groups] of Object.entries(data.cosmetics ?? {})) {
    for (const items of Object.values(groups)) {
      for (const name of items) {
        out.push({ type: 'item', label: name, sublabel: `Cosmetics — ${section}`, key: 'cos:' + name, route: '/cosmetics' });
      }
    }
  }

  for (const [section, items] of Object.entries(data.collectable ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Collectable — ${section}`, key: 'col:' + name, route: '/collectable' });
    }
  }

  for (const [section, items] of Object.entries(data.decorations ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Decorations — ${section}`, key: 'dec:' + name, route: '/decorations' });
    }
  }

  for (const [section, items] of Object.entries(data.codex ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Codex — ${section}`, key: 'codex:' + name, route: '/codex' });
    }
  }

  for (const [section, items] of Object.entries(data.market ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Market — ${section}`, key: 'market:' + name, route: '/market' });
    }
  }

  for (const [section, items] of Object.entries(data.extra ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Extra — ${section}`, key: 'extra:' + name, route: '/extra' });
    }
  }

  for (const [section, items] of Object.entries(data.modularGear ?? {})) {
    for (const name of items) {
      out.push({ type: 'item', label: name, sublabel: `Modular Gear — ${section}`, key: 'mod_gear:' + name, route: '/modular-gear' });
    }
  }

  return out;
}

@Component({
  selector: 'app-command-palette',
  imports: [ReactiveFormsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (paletteService.isOpen()) {
      <div class="backdrop" (click)="close()" aria-hidden="true"></div>
      <div
        class="palette"
        role="dialog"
        aria-label="Command palette"
        aria-modal="true"
        (keydown)="onKeydown($event)"
      >
        <div class="input-wrap">
          <span class="input-icon" aria-hidden="true">⌘</span>
          <input
            #searchInput
            class="search-input"
            type="text"
            placeholder="Search items, navigate sections, run actions…"
            aria-label="Command palette search"
            [attr.aria-activedescendant]="selectedResultId()"
            aria-autocomplete="list"
            [attr.aria-controls]="results().length > 0 ? 'palette-results' : null"
            [formControl]="searchControl"
            autocomplete="off"
            spellcheck="false"
          />
          @if (uncheckedOnly()) {
            <span class="filter-badge" aria-live="polite">Unchecked only</span>
          }
        </div>

        @if (results().length > 0) {
          <ul id="palette-results" class="results" role="listbox" aria-label="Results" #resultsList>
            @for (entry of results(); track entry.sublabel + entry.label; let i = $index) {
              <li
                [id]="'palette-result-' + i"
                class="result-item"
                [class.selected]="i === selectedIndex()"
                role="option"
                [attr.aria-selected]="i === selectedIndex()"
                (click)="execute(entry)"
                (mouseenter)="selectedIndex.set(i)"
              >
                <span class="result-icon" [class]="'icon-' + entry.type + (entry.type === 'item' && entry.checked ? ' icon-checked' : '')" aria-hidden="true">
                  {{ entryIcon(entry) }}
                </span>
                <span class="result-label">{{ entry.label }}</span>
                <span class="result-sublabel">{{ entry.sublabel }}</span>
              </li>
            }
          </ul>
        } @else if (rawQuery().length > 0) {
          <div class="empty" role="status">No results for "{{ displayQuery() }}"</div>
        } @else {
          <div class="hint" role="status">
            Type to search {{ itemCount() | number }} items — or navigate to any section
          </div>
        }

        <div class="footer" aria-hidden="true">
          <span><kbd>↑ ↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>!</kbd> unchecked only</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    }
  `,
  styles: [`
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      z-index: 1000;
      animation: fade-in 120ms ease;
    }
    .palette {
      position: fixed;
      top: 14vh;
      left: 50%;
      transform: translateX(-50%);
      width: min(640px, calc(100vw - 32px));
      z-index: 1001;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      box-shadow: 0 32px 96px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(200, 155, 60, 0.1);
      overflow: hidden;
      animation: slide-in 150ms cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateX(-50%) translateY(-8px) scale(0.98); }
      to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
    }

    .input-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--color-border);
    }
    .input-icon {
      font-size: 16px;
      color: var(--color-gold);
      flex-shrink: 0;
      opacity: 0.8;
    }
    .search-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--color-text);
      font-size: 15px;
      font-family: inherit;
      line-height: 1.4;
    }
    .search-input::placeholder {
      color: var(--color-text-muted);
      opacity: 0.6;
    }
    .filter-badge {
      background: rgba(200, 155, 60, 0.15);
      border: 1px solid rgba(200, 155, 60, 0.35);
      color: var(--color-gold-light);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .results {
      list-style: none;
      margin: 0;
      padding: 6px;
      max-height: 380px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--color-border) transparent;
    }
    .result-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 7px;
      cursor: pointer;
      transition: background 80ms;
      user-select: none;
    }
    .result-item.selected {
      background: var(--color-surface2);
    }
    .result-item.selected .result-label {
      color: var(--color-gold-light);
    }
    .result-icon {
      width: 18px;
      text-align: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .icon-nav { color: var(--color-gold); }
    .icon-action { color: #7eb8f7; }
    .icon-item { color: var(--color-text-muted); }
    .icon-item.icon-checked { color: var(--color-green); }

    .result-label {
      flex: 1;
      font-size: 13px;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .result-sublabel {
      font-size: 11px;
      color: var(--color-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .empty, .hint {
      padding: 32px 20px;
      text-align: center;
      font-size: 13px;
      color: var(--color-text-muted);
    }

    .footer {
      display: flex;
      gap: 16px;
      padding: 8px 16px;
      border-top: 1px solid var(--color-border);
      background: rgba(255, 255, 255, 0.015);
    }
    .footer span {
      font-size: 11px;
      color: var(--color-text-muted);
      opacity: 0.7;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    kbd {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      padding: 1px 5px;
      font-size: 10px;
      font-family: inherit;
      color: var(--color-text-muted);
    }
  `]
})
export class CommandPaletteComponent {
  protected readonly paletteService = inject(PaletteService);
  private readonly router = inject(Router);
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);

  @ViewChild('searchInput') private searchInputEl?: ElementRef<HTMLInputElement>;
  @ViewChild('resultsList') private resultsListEl?: ElementRef<HTMLUListElement>;

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly rawQuery = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  protected readonly uncheckedOnly = computed(() => this.rawQuery().trimStart().startsWith('!'));
  protected readonly displayQuery = computed(() => {
    const r = this.rawQuery();
    return this.uncheckedOnly() ? r.slice(r.indexOf('!') + 1).trim() : r.trim();
  });

  private readonly data = toSignal(this.dataService.getData());
  private readonly itemIndex = computed(() => buildItemIndex(this.data()));
  protected readonly itemCount = computed(() => this.itemIndex().length);

  protected readonly selectedIndex = signal(0);

  constructor() {
    // Reset index when query changes
    effect(() => {
      this.rawQuery();
      this.selectedIndex.set(0);
    });

    // Focus input when palette opens; reset when it closes
    effect(() => {
      if (this.paletteService.isOpen()) {
        setTimeout(() => this.searchInputEl?.nativeElement.focus(), 0);
      } else {
        this.searchControl.setValue('', { emitEvent: false });
        this.selectedIndex.set(0);
      }
    });
  }

  protected readonly results = computed((): ResultEntry[] => {
    const checkboxes = this.tracker.checkboxes();
    const raw = this.rawQuery();
    const uncheckedOnly = raw.trimStart().startsWith('!');
    const q = uncheckedOnly ? raw.slice(raw.indexOf('!') + 1).trim() : raw.trim();
    const ql = q.toLowerCase();

    const toResult = (e: IndexEntry): ResultEntry => ({
      ...e,
      checked: e.key ? (checkboxes[e.key] ?? false) : false,
    });

    if (!q && !uncheckedOnly) {
      return [...NAV_ENTRIES, ...ACTION_ENTRIES].map(toResult);
    }

    const itemResults: (ResultEntry & { score: number })[] = [];
    for (const entry of this.itemIndex()) {
      if (uncheckedOnly && (checkboxes[entry.key!] ?? false)) continue;
      const score = ql ? fuzzyScore(entry.label, ql) : 50;
      if (score > 0) {
        itemResults.push({ ...toResult(entry), score });
      }
    }
    itemResults.sort((a, b) => b.score - a.score);

    const metaResults: ResultEntry[] = uncheckedOnly
      ? []
      : [...NAV_ENTRIES, ...ACTION_ENTRIES]
          .filter(e => !ql || fuzzyScore(e.label, ql) > 0)
          .map(toResult);

    const slots = Math.max(0, 12 - metaResults.length);
    return [...metaResults, ...itemResults.slice(0, slots)];
  });

  protected selectedResultId = computed(() => {
    const i = this.selectedIndex();
    return this.results().length > 0 ? `palette-result-${i}` : null;
  });

  protected entryIcon(entry: ResultEntry): string {
    if (entry.type === 'nav') return '→';
    if (entry.type === 'action') return '⚡';
    return entry.checked ? '✓' : '○';
  }

  protected onKeydown(event: KeyboardEvent): void {
    const len = this.results().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(i => (i + 1) % len);
        this.scrollSelectedIntoView();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(i => (i - 1 + len) % len);
        this.scrollSelectedIntoView();
        break;
      case 'Enter': {
        event.preventDefault();
        const entry = this.results()[this.selectedIndex()];
        if (entry) this.execute(entry);
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.close();
        break;
    }
  }

  protected execute(entry: ResultEntry): void {
    if (entry.type === 'item' && entry.key) {
      this.tracker.toggle(entry.key);
    } else if (entry.type === 'nav' && entry.route) {
      const q = this.displayQuery();
      if (q) this.paletteService.setPendingSearch(q);
      this.router.navigateByUrl(entry.route);
      this.close();
    } else if (entry.type === 'action') {
      this.runAction(entry.actionId);
      this.close();
    }
  }

  protected close(): void {
    this.paletteService.close();
  }

  private runAction(actionId: string | undefined): void {
    if (actionId === 'export') {
      const json = this.tracker.exportState();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `wf-tracker-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  private scrollSelectedIntoView(): void {
    setTimeout(() => {
      const list = this.resultsListEl?.nativeElement;
      const selected = list?.querySelector('.selected');
      selected?.scrollIntoView({ block: 'nearest' });
    }, 0);
  }
}
