# WF Tracker — Best-Practices Remediation Plan

Deep-dive audit of `wf-tracker/src` against the guidelines in [CLAUDE.md](CLAUDE.md).
Scope: 29 components, 2 services, 1 model file. Angular v21, Tailwind v4, Vitest.

## Findings (by severity & spread)

| # | Issue | Rule violated | Spread |
|---|-------|---------------|--------|
| 1 | `standalone: true` set explicitly in `@Component` | "Must NOT set `standalone: true`" | **29 / 29 files** |
| 2 | No `changeDetection: OnPush` anywhere | "Set OnPush in `@Component`" | **29 / 29 files** |
| 3 | `@Input()` / `@Output()` decorators | "Use `input()`/`output()` functions" | 4 shared comps (14 decorators) |
| 4 | `: any` / `<any>` / `Record<string, any>` | "Avoid `any`; use `unknown`/types" | 21 files (68 hits; dashboard=31, data.service core) |
| 5 | Template-driven forms (`[(ngModel)]`) | "Prefer Reactive forms" | 7 files (24 hits; settings=15) |
| 6 | `*ngIf` / `*ngFor` structural directives | "Use native `@if`/`@for`" | section-header (3), sidebar (5) |
| 7 | `CommonModule` imported but unneeded | dead import (native control flow used) | 21 files |
| 8 | `OnInit` + manual `.subscribe()` on data | "Use async pipe / no leaks" | 21 feature files |
| 9 | `(click)` on non-interactive `<div>` headers | A11y: keyboard + role/ARIA | checklist, version-log |
| 10 | Getter `pct`/`pct(card)` instead of `computed()` | "Use `computed()` for derived state" | progress-bar, dashboard, personal-goals |
| 11 | Orphaned default scaffolding `app.html` (Angular splash) | dead code | `src/app/app.html` |
| 12 | `[class.sidebar-open]="true"` — bound to literal | dead binding | `app.ts` |
| 13 | A11y: icon-only buttons use `title` not `aria-label`; search input has no `<label>`; emoji icons need `aria-hidden` | WCAG AA / AXE | sidebar, checklist, personal-goals, others |

Note: `@HostBinding`/`@HostListener`, `ngClass`, `ngStyle`, and `<img>` without `NgOptimizedImage` were **not** found — those rules are already clean.

## Remediation phases

### Phase 0 — Safety net & baseline
- Confirm build/test run: `npm run build`, `npm test` (Vitest). Capture current state.
- This repo is **not** a git repo (`git init` recommended before refactor so changes are revertable).

### Phase 1 — Mechanical sweep (low risk, high spread) — Findings 1, 2, 7, 11, 12
Apply across all 29 components:
1. Remove `standalone: true` from every `@Component` decorator (it's the v20+ default).
2. Add `changeDetection: ChangeDetectionStrategy.OnPush` to every `@Component`; import `ChangeDetectionStrategy`.
3. Drop `CommonModule` from `imports` where only native control flow / pipes are used. Keep only the specific symbols still needed (e.g. import `SlicePipe` directly in version-log).
4. Delete orphaned `src/app/app.html` (App uses an inline template; the file is leftover CLI splash).
5. Remove the literal `[class.sidebar-open]="true"` binding in `app.ts`.

OnPush is the highest-value change for these components — most already use signals, so they're OnPush-ready. Verify each renders after.

### Phase 2 — Signal inputs/outputs — Finding 3
Convert the 4 shared components to the functional API:
- `tracker-table`: `columns`/`rows`/`checkedFn` → `input()`, `toggle` → `output()`.
- `checklist`: `groups` → `input()`, `toggle`/`bulkChange` → `output()`; replace the `ngOnChanges` → `_groups` mirror with a direct `input()` + `computed()` (removes `OnChanges`).
- `progress-bar`: inputs → `input()`; `pct` getter → `computed()` (Finding 10).
- `section-header`: inputs → `input()`.
Update consuming templates if any binding names change (they shouldn't).

### Phase 3 — Type safety — Finding 4
1. Define interfaces for the tracker JSON in `core/models/` (e.g. `TrackerData`, per-section shapes). The shape is discoverable from `dashboard.component.ts` total-calculators and `public/assets/tracker-data.json`.
2. `data.service.ts`: `HttpClient.get<TrackerData>()`, `Observable<TrackerData>` — remove both `any`.
3. `dashboard.component.ts`: type `data` signal and all `*Total(d)` helpers against `TrackerData`; remove the 31 `any` hits.
4. Sweep remaining feature components (each ~2 `any`) to the new types or `unknown` + narrowing.

### Phase 4 — Reactive forms — Finding 5
Replace `[(ngModel)]` + `FormsModule` with `ReactiveFormsModule` / `FormControl`/`FormGroup`:
- `settings.component.ts` (15 hits — largest; likely a settings `FormGroup`).
- `personal-goals`, `big-goals`, `checklist` (search box → `FormControl` + `valueChanges`), and the remaining `ngModel` files.
- Replace `(change)="...+$any($event.target).value"` casts (personal-goals) with typed reactive controls.

### Phase 5 — RxJS subscription hygiene — Finding 8
For the 21 feature components doing `dataService.getData().subscribe(...)` in `OnInit`:
- Prefer `toSignal(this.dataService.getData())` (or async pipe in template) so there's no manual subscription/leak and it composes with existing `computed()`s. Removes most `OnInit` implementations.

### Phase 6 — Native control flow — Finding 6
- `sidebar.component.ts`: convert the 5 `*ngIf` to `@if` (already mixes `@for` with `*ngIf`).
- `section-header.component.ts`: convert 3 `*ngIf` to `@if`.

### Phase 7 — Accessibility — Findings 9, 13
- Collapsible `<div (click)>` headers (checklist, version-log) → `<button>` (or add `role="button"`, `tabindex="0"`, keydown Enter/Space) with `aria-expanded`.
- Icon-only buttons (sidebar collapse, delete `✕`) → add `aria-label` (keep `title` optional).
- Search inputs → associate a `<label>` (visually-hidden) or `aria-label`.
- Decorative emoji/glyph icons → `aria-hidden="true"`.
- Verify color contrast of `--color-text-muted` / `--color-gold` on surfaces meets WCAG AA.
- Run AXE (e.g. via the dev server) and fix remaining violations.

### Phase 8 — Verify
- `npm run build` clean, `npm test` green.
- Manual/preview pass per route; AXE clean on key pages (dashboard, settings, a checklist page).

## Suggested order & effort
Phases 1 → 2 → 3 are the backbone (most files, mostly mechanical). 4 and 7 are the most logic-sensitive. Recommend landing Phase 1 on its own first (touches every file, easy to review), then the rest incrementally.
