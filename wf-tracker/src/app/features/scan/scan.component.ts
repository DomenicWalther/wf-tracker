import {
  Component, inject, signal, computed, ChangeDetectionStrategy, ElementRef, viewChild
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, icons } from 'lucide-angular';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { findBestMatch } from '../../core/utils/fuzzy-match';
import { TrackerData } from '../../core/models/tracker.models';

const { Upload, ScanLine, SquareCheck, Square, ChevronDown } = icons;

type Phase = 'idle' | 'processing' | 'results' | 'done' | 'error';

interface ScanCandidate {
  name: string;
  section: 'gear' | 'mod' | 'quest' | 'relic';
  trackerKey: (col: string) => string;
}

interface ScanMatch {
  id: string;
  rawText: string;
  matchedName: string;
  section: 'gear' | 'mod' | 'quest' | 'relic';
  trackerKey: (col: string) => string;
  confidence: number;
}

const GEAR_COLUMNS = [
  { key: 'mastery',       label: 'Mastery' },
  { key: 'maxBuild',      label: 'Max Build' },
  { key: 'reactor',       label: 'Reactor' },
  { key: 'exilus',        label: 'Exilus' },
  { key: 'arcaneAdapter', label: 'Arcane Adapter' },
  { key: 'shards',        label: '5 Shards' },
  { key: 'tau',           label: 'Tau' },
  { key: 'auraForma',     label: 'Aura Forma' },
  { key: 'stanceForma',   label: 'Stance Forma' },
  { key: 'lens',          label: 'Lens' },
];

function buildCandidates(data: TrackerData): ScanCandidate[] {
  const result: ScanCandidate[] = [];

  for (const [, items] of Object.entries(data.gear)) {
    for (const item of items) {
      const name = item.name;
      result.push({
        name,
        section: 'gear',
        trackerKey: (col) => `gear:${name}:${col}`,
      });
    }
  }

  for (const mod of data.mods) {
    result.push({
      name: mod.name,
      section: 'mod',
      trackerKey: () => `mod:${mod.name}`,
    });
  }

  for (const quest of data.quests) {
    result.push({
      name: quest,
      section: 'quest',
      trackerKey: () => `quest:${quest}`,
    });
  }

  for (const names of Object.values(data.relics)) {
    for (const name of names) {
      result.push({
        name,
        section: 'relic',
        trackerKey: () => `relic:${name}`,
      });
    }
  }

  return result;
}

function preprocessCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Boost contrast: push pixels toward black or white
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const boosted = avg > 128 ? Math.min(255, avg * 1.3) : Math.max(0, avg * 0.7);
    data[i] = data[i + 1] = data[i + 2] = boosted;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

@Component({
  selector: 'app-scan',
  imports: [FormsModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">SCAN SCREENSHOT</h1>
        <p class="page-desc">
          Upload a Warframe screenshot to automatically detect and mark items as complete.
          OCR runs entirely in your browser — no data is sent anywhere.
        </p>
      </div>

      <input
        #fileInput
        type="file"
        accept="image/*"
        class="sr-only"
        aria-label="File input"
        (change)="onFileSelected($event)"
      />

      @if (phase() === 'idle') {
        <div
          class="drop-zone"
          [class.drag-over]="dragOver()"
          role="button"
          tabindex="0"
          aria-label="Upload screenshot — drag and drop or click to browse"
          (click)="triggerFileInput()"
          (keydown.enter)="triggerFileInput()"
          (keydown.space)="triggerFileInput()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave()"
          (drop)="onDrop($event)"
        >
          <lucide-icon [img]="uploadIcon" [size]="36" aria-hidden="true" class="drop-icon" />
          <span class="drop-title">Drop screenshot here or click to browse</span>
          <span class="drop-hint">PNG, JPG, WEBP — Warframe UI screenshots work best</span>
        </div>
      }

      @if (phase() === 'processing') {
        <div class="processing-box" aria-live="polite" aria-busy="true">
          <lucide-icon [img]="scanIcon" [size]="28" aria-hidden="true" class="scan-spin" />
          <div class="processing-label">Running OCR…</div>
          <div class="progress-track" role="progressbar" [attr.aria-valuenow]="Math.round(ocrProgress() * 100)" aria-valuemin="0" aria-valuemax="100">
            <div class="progress-fill" [style.width.%]="ocrProgress() * 100"></div>
          </div>
          <div class="progress-pct">{{ Math.round(ocrProgress() * 100) }}%</div>
        </div>
      }

      @if (phase() === 'results') {
        <div class="results-toolbar">
          <div class="toolbar-left">
            <span class="match-count">
              {{ filteredMatches().length }} match{{ filteredMatches().length === 1 ? '' : 'es' }}
              &nbsp;·&nbsp;
              {{ selectedCount() }} selected
            </span>
            <div class="filter-pills" role="group" aria-label="Filter by section">
              @for (f of sectionFilters; track f.value) {
                <button
                  type="button"
                  class="pill"
                  [class.active]="sectionFilter() === f.value"
                  (click)="sectionFilter.set(f.value)"
                >{{ f.label }}</button>
              }
            </div>
          </div>
          <div class="toolbar-right">
            <div class="column-select-wrap">
              <label for="gear-col-select" class="col-label">Gear column:</label>
              <div class="select-wrapper">
                <select id="gear-col-select" [(ngModel)]="gearColumn" class="col-select" aria-label="Gear column to mark">
                  @for (col of gearColumns; track col.key) {
                    <option [value]="col.key">{{ col.label }}</option>
                  }
                </select>
                <lucide-icon [img]="chevronIcon" [size]="12" aria-hidden="true" class="select-arrow" />
              </div>
            </div>
            <button type="button" class="btn-ghost" (click)="selectAll()">Select all</button>
            <button type="button" class="btn-ghost" (click)="selectNone()">Deselect all</button>
            <button
              type="button"
              class="btn-primary"
              [disabled]="selectedCount() === 0"
              (click)="applySelected()"
            >
              Apply {{ selectedCount() }} item{{ selectedCount() === 1 ? '' : 's' }}
            </button>
          </div>
        </div>

        <div class="match-list" role="list" aria-label="Detected items">
          @for (match of filteredMatches(); track match.id) {
            <div class="match-row" role="listitem" [class.selected]="isSelected(match.id)">
              <button
                type="button"
                class="match-check"
                [attr.aria-pressed]="isSelected(match.id)"
                [attr.aria-label]="(isSelected(match.id) ? 'Deselect ' : 'Select ') + match.matchedName"
                (click)="toggleSelected(match.id)"
              >
                <lucide-icon
                  [img]="isSelected(match.id) ? checkSquareIcon : squareIcon"
                  [size]="16"
                  aria-hidden="true"
                />
              </button>
              <div class="match-info">
                <span class="match-name">{{ match.matchedName }}</span>
                @if (match.rawText.toLowerCase() !== match.matchedName.toLowerCase()) {
                  <span class="match-raw">OCR: "{{ match.rawText }}"</span>
                }
              </div>
              <span class="match-section" [attr.data-section]="match.section">{{ match.section }}</span>
              <span class="match-confidence" [class.high]="match.confidence >= 0.9" [class.mid]="match.confidence >= 0.8 && match.confidence < 0.9">
                {{ Math.round(match.confidence * 100) }}%
              </span>
              <span class="match-already" [class.already]="isAlreadyChecked(match)">
                {{ isAlreadyChecked(match) ? 'already done' : '' }}
              </span>
            </div>
          }
          @if (filteredMatches().length === 0) {
            <div class="empty-msg">No matches in this section.</div>
          }
        </div>

        <div class="raw-section">
          <button type="button" class="raw-toggle" (click)="showRaw.update(v => !v)" [attr.aria-expanded]="showRaw()">
            Show raw OCR text
          </button>
          @if (showRaw()) {
            <pre class="raw-text" aria-label="Raw OCR output">{{ rawText() }}</pre>
          }
        </div>

        <div class="rescan-row">
          <button type="button" class="btn-ghost" (click)="reset()">Scan another screenshot</button>
        </div>
      }

      @if (phase() === 'done') {
        <div class="done-box" aria-live="polite">
          <div class="done-title">Done! {{ appliedCount() }} item{{ appliedCount() === 1 ? '' : 's' }} marked.</div>
          <button type="button" class="btn-primary" (click)="reset()">Scan another screenshot</button>
        </div>
      }

      @if (phase() === 'error') {
        <div class="error-box" aria-live="assertive">
          <div class="error-title">OCR failed</div>
          <div class="error-desc">Could not process the image. Make sure it's a valid PNG, JPG, or WEBP file and try again.</div>
          <button type="button" class="btn-primary" (click)="reset()">Try again</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }

    .page-header { margin-bottom: 28px; }
    .page-title {
      font-size: 20px; font-weight: 700; letter-spacing: 0.1em;
      color: var(--color-text); margin-bottom: 6px;
    }
    .page-desc { font-size: 13px; color: var(--color-text-muted); line-height: 1.6; }

    /* Drop zone */
    .drop-zone {
      border: 2px dashed var(--color-border);
      border-radius: 10px;
      padding: 56px 24px;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      cursor: pointer;
      transition: border-color var(--transition-fast), background var(--transition-fast);
      outline: none;
    }
    .drop-zone:hover, .drop-zone:focus-visible { border-color: var(--color-accent); background: var(--color-surface2); }
    .drop-zone.drag-over { border-color: var(--color-accent-light); background: var(--color-surface2); }
    .drop-icon { color: var(--color-accent-light); opacity: 0.7; }
    .drop-title { font-size: 15px; font-weight: 600; color: var(--color-text); }
    .drop-hint { font-size: 12px; color: var(--color-text-muted); }
    .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; }

    /* Processing */
    .processing-box {
      display: flex; flex-direction: column; align-items: center; gap: 14px;
      padding: 56px 24px; color: var(--color-text-muted);
    }
    .processing-label { font-size: 14px; color: var(--color-text); }
    .scan-spin { color: var(--color-accent-light); animation: spin 1.6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .progress-track {
      width: 280px; height: 6px; background: var(--color-surface2);
      border-radius: 3px; overflow: hidden;
    }
    .progress-fill { height: 100%; background: var(--color-accent); border-radius: 3px; transition: width 0.15s; }
    .progress-pct { font-size: 12px; }

    /* Toolbar */
    .results-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 10px; margin-bottom: 12px;
    }
    .toolbar-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .toolbar-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .match-count { font-size: 13px; color: var(--color-text-muted); white-space: nowrap; }

    .filter-pills { display: flex; gap: 4px; }
    .pill {
      padding: 3px 10px; border-radius: 20px; border: 1px solid var(--color-border);
      font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em;
      cursor: pointer; background: none; color: var(--color-text-muted);
      transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
    }
    .pill:hover { background: var(--color-surface2); color: var(--color-text); }
    .pill.active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }

    .column-select-wrap { display: flex; align-items: center; gap: 6px; }
    .col-label { font-size: 12px; color: var(--color-text-muted); white-space: nowrap; }
    .select-wrapper { position: relative; display: flex; align-items: center; }
    .col-select {
      appearance: none; background: var(--color-surface2); border: 1px solid var(--color-border);
      color: var(--color-text); padding: 4px 24px 4px 8px; border-radius: 4px;
      font-size: 12px; cursor: pointer; outline: none;
    }
    .col-select:focus { border-color: var(--color-accent-light); }
    .select-arrow { position: absolute; right: 6px; pointer-events: none; color: var(--color-text-muted); }

    .btn-ghost {
      background: none; border: 1px solid var(--color-border); color: var(--color-text-muted);
      padding: 5px 12px; border-radius: 4px; font-size: 12px; cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast);
    }
    .btn-ghost:hover { border-color: var(--color-accent); color: var(--color-text); }
    .btn-primary {
      background: var(--color-accent); border: none; color: #fff;
      padding: 6px 16px; border-radius: 4px; font-size: 13px; font-weight: 600;
      cursor: pointer; transition: opacity var(--transition-fast);
    }
    .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
    .btn-primary:not(:disabled):hover { opacity: 0.85; }

    /* Match list */
    .match-list { display: flex; flex-direction: column; gap: 2px; margin-bottom: 20px; }
    .match-row {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 12px; border-radius: 5px;
      border: 1px solid transparent;
      transition: background var(--transition-fast), border-color var(--transition-fast);
    }
    .match-row:hover { background: var(--color-surface2); }
    .match-row.selected { background: color-mix(in srgb, var(--color-accent) 10%, transparent); border-color: color-mix(in srgb, var(--color-accent) 30%, transparent); }

    .match-check {
      background: none; border: none; cursor: pointer; padding: 0;
      color: var(--color-text-muted); flex-shrink: 0; display: flex; align-items: center;
    }
    .match-row.selected .match-check { color: var(--color-accent-light); }
    .match-check:focus-visible { outline: 2px solid var(--color-accent-light); border-radius: 3px; }

    .match-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .match-name { font-size: 13px; font-weight: 500; color: var(--color-text); }
    .match-raw { font-size: 11px; color: var(--color-text-muted); font-style: italic; }

    .match-section {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
      padding: 2px 7px; border-radius: 3px; background: var(--color-surface2);
      color: var(--color-text-muted); flex-shrink: 0;
    }
    .match-section[data-section="gear"] { color: #7eb8f7; }
    .match-section[data-section="mod"] { color: #b8a4f7; }
    .match-section[data-section="quest"] { color: #f7d07e; }
    .match-section[data-section="relic"] { color: #7ef7c4; }

    .match-confidence { font-size: 11px; flex-shrink: 0; color: var(--color-text-muted); }
    .match-confidence.high { color: #6bcd8e; }
    .match-confidence.mid { color: #f0c070; }

    .match-already { font-size: 10px; width: 70px; flex-shrink: 0; color: var(--color-text-muted); }
    .match-already.already { color: #6bcd8e; }

    .empty-msg { padding: 24px; text-align: center; color: var(--color-text-muted); font-size: 13px; }

    /* Raw OCR */
    .raw-section { margin-bottom: 16px; }
    .raw-toggle {
      background: none; border: none; color: var(--color-text-muted); font-size: 12px;
      cursor: pointer; text-decoration: underline; padding: 0;
    }
    .raw-toggle:hover { color: var(--color-text); }
    .raw-text {
      margin-top: 8px; padding: 12px; background: var(--color-surface2);
      border: 1px solid var(--color-border); border-radius: 5px;
      font-size: 11px; white-space: pre-wrap; word-break: break-all;
      color: var(--color-text-muted); max-height: 200px; overflow-y: auto;
    }

    .rescan-row { display: flex; gap: 8px; }

    /* Done */
    .done-box {
      display: flex; flex-direction: column; align-items: center; gap: 16px;
      padding: 56px 24px; text-align: center;
    }
    .done-title { font-size: 18px; font-weight: 600; color: var(--color-text); }

    /* Error */
    .error-box {
      display: flex; flex-direction: column; align-items: center; gap: 12px;
      padding: 56px 24px; text-align: center;
    }
    .error-title { font-size: 18px; font-weight: 600; color: #f07070; }
    .error-desc { font-size: 13px; color: var(--color-text-muted); max-width: 380px; line-height: 1.6; }
  `]
})
export class ScanComponent {
  protected readonly Math = Math;

  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly data = toSignal(this.dataService.getData());

  readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  readonly uploadIcon = Upload;
  readonly scanIcon = ScanLine;
  readonly checkSquareIcon = SquareCheck;
  readonly squareIcon = Square;
  readonly chevronIcon = ChevronDown;

  readonly gearColumns = GEAR_COLUMNS;
  gearColumn = 'mastery';

  readonly sectionFilters = [
    { value: 'all', label: 'All' },
    { value: 'gear', label: 'Gear' },
    { value: 'mod', label: 'Mods' },
    { value: 'quest', label: 'Quests' },
    { value: 'relic', label: 'Relics' },
  ] as const;

  readonly phase = signal<Phase>('idle');
  readonly ocrProgress = signal(0);
  readonly rawText = signal('');
  readonly matches = signal<ScanMatch[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly appliedCount = signal(0);
  readonly dragOver = signal(false);
  readonly sectionFilter = signal<'all' | 'gear' | 'mod' | 'quest' | 'relic'>('all');
  readonly showRaw = signal(false);

  readonly filteredMatches = computed(() => {
    const f = this.sectionFilter();
    const all = this.matches();
    return f === 'all' ? all : all.filter(m => m.section === f);
  });

  readonly selectedCount = computed(() => this.selectedIds().size);

  triggerFileInput(): void {
    this.fileInput().nativeElement.click();
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(true);
  }

  onDragLeave(): void {
    this.dragOver.set(false);
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    this.dragOver.set(false);
    const file = e.dataTransfer?.files[0];
    if (file) this.processFile(file);
  }

  onFileSelected(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.processFile(file);
    input.value = '';
  }

  isSelected(id: string): boolean {
    return this.selectedIds().has(id);
  }

  isAlreadyChecked(match: ScanMatch): boolean {
    const key = match.trackerKey(this.gearColumn);
    return this.tracker.isChecked(key);
  }

  toggleSelected(id: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  selectAll(): void {
    const filtered = this.filteredMatches().map(m => m.id);
    this.selectedIds.update(set => {
      const next = new Set(set);
      for (const id of filtered) next.add(id);
      return next;
    });
  }

  selectNone(): void {
    const filtered = new Set(this.filteredMatches().map(m => m.id));
    this.selectedIds.update(set => {
      const next = new Set(set);
      for (const id of filtered) next.delete(id);
      return next;
    });
  }

  applySelected(): void {
    const sel = this.selectedIds();
    let count = 0;
    for (const match of this.matches()) {
      if (!sel.has(match.id)) continue;
      const key = match.trackerKey(this.gearColumn);
      if (!this.tracker.isChecked(key)) {
        this.tracker.toggle(key);
        count++;
      }
    }
    this.appliedCount.set(count);
    this.phase.set('done');
  }

  reset(): void {
    this.phase.set('idle');
    this.ocrProgress.set(0);
    this.rawText.set('');
    this.matches.set([]);
    this.selectedIds.set(new Set());
    this.showRaw.set(false);
    this.sectionFilter.set('all');
  }

  private async processFile(file: File): Promise<void> {
    this.phase.set('processing');
    this.ocrProgress.set(0);

    try {
      const imageUrl = await this.loadImageAsUrl(file);
      const canvas = await this.buildProcessedCanvas(imageUrl);

      // Lazy-load Tesseract so it doesn't bloat the initial bundle
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            this.ocrProgress.set(m.progress);
          }
        },
      });

      const { data } = await worker.recognize(canvas);
      await worker.terminate();

      this.rawText.set(data.text);
      this.runMatching(data.text);
      this.phase.set('results');
    } catch {
      this.phase.set('error');
    }
  }

  private loadImageAsUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private buildProcessedCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(preprocessCanvas(img));
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  private runMatching(text: string): void {
    const data = this.data();
    if (!data) return;

    const candidates = buildCandidates(data);
    const names = candidates.map(c => c.name);

    // Build a set of query tokens: individual words, bigrams, and trigrams
    // so "NeoS19" (1 token) and "Neo S19" (2 tokens on different lines) both match.
    const tokens = text
      .split(/[\n\r]+/)
      .flatMap(line => {
        const words = line.trim().split(/\s+/).filter(w => w.length >= 2);
        const grams: string[] = [...words];
        for (let i = 0; i < words.length - 1; i++) grams.push(words[i] + ' ' + words[i + 1]);
        for (let i = 0; i < words.length - 2; i++) grams.push(words[i] + ' ' + words[i + 1] + ' ' + words[i + 2]);
        return grams;
      })
      .filter(t => t.length >= 3);

    const seen = new Set<string>();
    const results: ScanMatch[] = [];

    for (const token of tokens) {
      const best = findBestMatch(token, names);
      if (!best || seen.has(best.item)) continue;
      seen.add(best.item);

      const candidate = candidates.find(c => c.name === best.item)!;
      results.push({
        id: `${candidate.section}:${candidate.name}`,
        rawText: token,
        matchedName: candidate.name,
        section: candidate.section,
        trackerKey: candidate.trackerKey,
        confidence: best.score,
      });
    }

    results.sort((a, b) => b.confidence - a.confidence);
    this.matches.set(results);
    this.selectedIds.set(new Set(results.filter(r => r.confidence >= 0.85).map(r => r.id)));
  }
}
