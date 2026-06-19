import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';

/**
 * A collapsible section card: a header button (disclosure arrow, title, optional
 * trailing progress) over a body that the *parent* conditionally renders.
 *
 * The body is plain `<ng-content>` so the caller keeps ownership of lazy
 * rendering — wrap the projected body in `@if (open) { … }` to avoid building
 * heavy content (e.g. a tracker-table) while collapsed.
 *
 * Slots:
 *  - default          → the body (render it under your own `@if (open)`)
 *  - `[csBadge]`       → inline content after the title (e.g. a "NOW" pill)
 *  - `[csTrailing]`    → custom trailing header content (e.g. an `<app-progress-bar>`)
 *
 * Replaces the hand-rolled `*-section` / `*-section-header` markup + styles that
 * were copy-pasted across relics, mods, arcanes, atragraph, gear, lich-gear and
 * incarnon.
 */
@Component({
  selector: 'app-collapsible-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cs" [class.cs--highlighted]="highlighted()">
      <button
        type="button"
        class="cs-header"
        (click)="toggle.emit()"
        [attr.aria-expanded]="open()"
      >
        <span class="cs-arrow" aria-hidden="true">{{ open() ? '▾' : '▸' }}</span>
        <span class="cs-name">{{ name() }}<ng-content select="[csBadge]" /></span>
        @if (progress()) {
          <span class="cs-progress">{{ progress() }}</span>
        }
        <ng-content select="[csTrailing]" />
      </button>
      <ng-content />
    </div>
  `,
  styles: [`
    .cs {
      border: 1px solid var(--color-border);
      border-radius: 6px;
      margin-bottom: 8px;
      overflow: hidden;
    }
    .cs--highlighted { border-color: var(--color-accent); }
    .cs--highlighted .cs-header { background: rgba(200, 155, 60, 0.08); }
    .cs-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--color-surface2);
      cursor: pointer;
      width: 100%;
      text-align: left;
      border: none;
      font: inherit;
      color: inherit;
    }
    .cs-header:hover { background: var(--color-surface3); }
    .cs-header:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; }
    .cs-arrow { color: var(--color-accent); width: 12px; font-size: 12px; }
    .cs-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--color-text); }
    .cs-progress { font-size: 11px; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  `]
})
export class CollapsibleSectionComponent {
  /** Title shown in the header. */
  readonly name = input.required<string>();
  /** Optional trailing progress text (e.g. "3/5"). Omit when using `[csTrailing]`. */
  readonly progress = input<string>();
  /** Whether the section is expanded. */
  readonly open = input.required<boolean>();
  /** Applies the highlighted treatment (accent border + tinted header). */
  readonly highlighted = input(false);
  /** Emitted when the header is activated. */
  readonly toggle = output<void>();
}
