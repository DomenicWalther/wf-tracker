# WF Tracker — Continuation Plan

> Drop this file into any new chat to pick up exactly where we left off.
> Last updated: 2026-05-31

---

## Project overview

Converting the Excel file `C:\Users\Domenic\Downloads\WARFRAME COMPLETION TRACKER - PUBLIC.xlsx`
into an Angular 21 + Tailwind CSS web app with full localStorage persistence.

**Angular project root:** `D:\1 Arbeit\4 - Programmieren\2026\wf-tracker\wf-tracker\`
**Data extraction script:** `D:\1 Arbeit\4 - Programmieren\2026\wf-tracker\extract_data.py`
**Extracted JSON:** `public/assets/tracker-data.json` (777 KB, ~15 000+ items)
**Dev server:** `npm start` in the project root → http://localhost:4200
**Launch config for preview:** `.claude/launch.json` at `D:\1 Arbeit\4 - Programmieren\2026\wf-tracker\`

---

## Architecture

```
src/app/
├── app.ts                          # Root shell with <app-sidebar> + <router-outlet>
├── app.routes.ts                   # Lazy-loaded routes for all 24 sections
├── app.config.ts                   # provideRouter + provideHttpClient
├── core/
│   ├── models/tracker.models.ts    # All interfaces + DEFAULT_SETTINGS
│   └── services/
│       ├── tracker.service.ts      # localStorage wrapper (signals), setOverallProgress()
│       └── data.service.ts         # HTTP GET tracker-data.json (shareReplay)
└── shared/components/
│   ├── sidebar/                    # Collapsible left nav, overall % bar
│   ├── section-header/             # Title + description + progress bar
│   ├── progress-bar/               # Reusable bar
│   └── checklist/                  # Generic grouped checklist with search + bulk toggle
└── features/
    ├── dashboard/                  # Overview cards, rank name, overall %
    ├── settings/                   # All toggles: section enables, gear columns, cosmetics flags…
    ├── personal-goals/             # Editable number + checkbox goals
    ├── big-goals/                  # 6 extreme completionist goals
    ├── version-log/                # Expandable changelog
    ├── gear/                       # Table view (rows = items, cols = upgrade types)
    ├── quests/                     # Simple checklist (41 quests)
    ├── lich-gear/                  # Kuva / Tenet / Coda (48 weapons)
    ├── incarnon/                   # 41 weapon families, all variants
    ├── arcanes/                    # 5 sections (warframe / weapon / amp / companion / other)
    ├── mods/                       # 1491 mods grouped by category
    ├── subsume/                    # 63 warframe abilities
    ├── railjack/                   # Intrinsics + house components
    ├── relics/                     # Lith/Meso/Neo/Axi (729 relics)
    ├── blueprints/                 # 14 vendor categories, ~1494 blueprints
    ├── items/                      # 9 sections, ~663 items
    ├── cosmetics/                  # TENNOGEN + REMAINING COSMETICS
    ├── collectable/                # 8 sections: Glyphs/Sigils/Ephemera/Scenes/Sumdali…
    ├── decorations/                # 27 location sections, ~1239 decorations
    ├── codex/                      # Objects/Enemies/Fragments/Somachord/FrameFighter/Prex
    ├── market/                     # Emotes/Animations/Themes/Sounds/etc.
    ├── extra/                      # Junctions/Focus/Arcane Helmets/Landing Craft/Syndicates…
    └── modular-gear/               # AMPS / ZAWS / KIT GUNS / MOA / HOUND combinations
```

**State management:** All checkbox/number/text state in `TrackerService` → `localStorage['wf-tracker-state']`.
Key format convention: `{prefix}:{itemName}` e.g. `gear:Ash:mastery`, `quest:Awakening`, `mod:Adaptation`.

---

## What is DONE ✅

- Full Angular project scaffolded with Tailwind CSS
- Dark Warframe aesthetic (charcoal bg, gold accents, custom checkboxes)
- Collapsible sidebar with grouped nav + accurate overall progress bar
- Dashboard with 18 section cards showing live progress + rank name
- Settings page: section toggles, gear upgrade columns, founder flag, all filter flags
- Personal Goals page (editable number goals + checkbox goals)
- Big Goals, Version Log pages
- All 16 list-based sections use reusable `ChecklistComponent` (search, group collapse, bulk check/uncheck)
- Gear page: table view with per-item upgrade columns driven by settings
- TrackerService + DataService with `shareReplay` HTTP caching
- `totalTrackable` signal keeps sidebar % accurate (set via `effect()` in dashboard)
- localStorage persistence, export/reset in settings
- **Lich Gear: multi-column table** — Obtained / 60% Element / Valence Fusion per weapon, collapsible groups, search ✅
- **Task Checklist** — Daily/Weekly/Other sections with auto-reset (Warframe UTC times), sub-tasks, hide/restore, collapsible groups, per-task metadata (prereq/location/info), localStorage ✅
- **World State panel** — live cycle data (Cetus/Orb Vallis/Cambion Drift/Earth) via warframestat.us, countdown timers, phase progress bars, auto-refresh every 60 s, manual refresh ✅

---

## Known DATA EXTRACTION BUGS 🐛

These are in `extract_data.py` — the JSON currently has 0 items for these sections.
Re-run the script then `Copy-Item src\assets\tracker-data.json public\assets\tracker-data.json` after fixing.

| Section | Issue | Fix |
|---|---|---|
| `gear.companions` | 0 items — section header "Companions" is likely at a row being skipped | Check raw rows around companion section; probably same off-by-one as warframes was |
| `gear.archwingWeapons` | 0 items | Same — "Archwing Weapons" header row is being skipped |
| `gear.extras` | 0 items | Same — "Extra" header row is being skipped |
| `arcanes.companion` | 0 items | Check which row "COMPANION" section header appears on in ARCANES sheet |
| `cosmetics` | Only 2 top-level keys instead of many sub-categories | The cosmetics sheet has a complex multi-column layout; TENNOGEN + per-frame subcategories need deeper parsing |
| `modularGear` | Missing AMPS section (ZAWS/KIT GUNS/MOA/HOUND present) | AMPS section header detection is failing |
| `extra.SYNDICATE MAX RANK` | 458 items — seems too many, probably pulling wrong rows | Investigate the SYNDICATE MAX RANK section in the EXTRA sheet |

**To debug any of these, run:**
```python
python -c "
import openpyxl, sys
sys.stdout.reconfigure(encoding='utf-8')
wb = openpyxl.load_workbook(r'C:\Users\Domenic\Downloads\WARFRAME COMPLETION TRACKER - PUBLIC.xlsx', data_only=True)
ws = wb['GEAR']  # or whichever sheet
for i, row in enumerate(ws.iter_rows(min_row=1, max_row=600, values_only=True), 1):
    non_none = [(j, v) for j, v in enumerate(row) if v is not None and not isinstance(v, bool)]
    if non_none:
        print(f'row {i}: {non_none[:6]}')
" 2>&1
```

---

## Planned improvements / TODO 📋

### High priority
- [ ] **Fix extraction bugs** (companions, archwingWeapons, extras, companion arcanes, cosmetics, amps, syndicates)
- [ ] **Cosmetics deep-parse** — the sheet has TENNOGEN helmets, WARFRAME skins, SYANDANAS, OPERATOR skins etc. split across many sub-categories and multi-column layout. Each needs its own group.
- [ ] **Gear page: Companions & Archwing Weapons sections** — once data extraction is fixed, confirm they render correctly
- [ ] **Sidebar overall % updates from non-dashboard pages** — currently the `effect()` only runs when Dashboard is active. Other pages should also push their section progress. Options: (a) move effect to app.ts, (b) use a shared `ProgressService` that subscribes to all data + checkboxes.

### Medium priority
- [ ] **Mods: category grouping** — all 1491 mods currently group correctly at the component level (custom grouping logic in mods.component.ts), but underlying extraction may still lump them under "General". Verify in the running app; if grouping looks wrong, fix `extract_data.py` header detection.
- [ ] **Search across all sections from sidebar** — global search bar that jumps to matching items
- [ ] **Filter buttons per section** — e.g. "Show only unchecked", "Show only Founder items"
- [ ] **Incarnon: completionist setting** — Incarnon Completionist flag should hide/show non-standard weapon variants
- [ ] **Arcanes: Arcane Psycho setting** — when enabled, show rank columns (Base/R1/R2/R3/R4) per arcane; currently shows flat list
- [ ] **Relics: Hoarder setting** — when enabled, show Exceptional/Flawless/Radiant columns per relic
- [ ] **Blueprints: hoarder flag on items** — currently all blueprints show regardless of hoarder setting
- [ ] **Codex: old setting** — greying out/hiding old impossible scans when setting is off
- [ ] **World State: cycle-expiry auto-refresh** — when countdown reaches 0 the panel should trigger a reload immediately rather than waiting up to 60 s for the next scheduled refresh

### Nice to have
- [ ] **Import from Excel** — parse a user's filled-out .xlsx to pre-populate checkboxes
- [ ] **Export to Excel** — write checked state back into a copy of the Excel
- [ ] **Backend option** — TrackerService already has clean interface; add `environment.ts` flag to switch HTTP endpoints
- [ ] **Per-section notes/comments field** — like the "Comments" column in Gear
- [ ] **Forma counter on Gear** — the Excel tracks forma count per item; add a number input
- [ ] **Mobile layout** — sidebar collapses to bottom nav or hamburger on small screens
- [ ] **Keyboard shortcut** to check/uncheck focused item (Space key)
- [ ] **"Jump to next unchecked"** button per section
- [ ] **Warframe API integration** — fetch owned items automatically (Warframe.market API or community APIs)

---

## How to run

```powershell
# Start dev server
Set-Location "D:\1 Arbeit\4 - Programmieren\2026\wf-tracker\wf-tracker"
npm start
# → http://localhost:4200

# Re-extract data after fixing extract_data.py
python "D:\1 Arbeit\4 - Programmieren\2026\wf-tracker\extract_data.py"
Copy-Item -Force src\assets\tracker-data.json public\assets\tracker-data.json
# Then reload the browser
```

---

## File sizes / item counts (current JSON)

| Section | Items |
|---|---|
| Quests | 41 |
| Gear – Warframes | 113 |
| Gear – Primaries | 187 |
| Gear – Secondaries | 146 |
| Gear – Melees | 317 |
| Gear – Companions | **0 (bug)** |
| Gear – Archwings | 104 |
| Gear – Archwing Weapons | **0 (bug)** |
| Gear – Extras | **0 (bug)** |
| Lich Gear (Kuva/Tenet/Coda) | 48 |
| Incarnon families | 41 (with weapon variants) |
| Arcanes | 162 |
| Mods | 1491 |
| Subsume | 63 |
| Railjack | ~81 |
| Relics | 729 |
| Blueprints | ~1494 |
| Items | ~663 |
| Cosmetics | ~2658 (partially parsed) |
| Collectable | 2194 |
| Decorations | 1239 |
| Codex | 1601 |
| Market | 239 |
| Extra | 516 |
| Modular Gear | 3245 |
| Big Goals | 6 |

---

## Style reference

CSS variables (in `src/styles.css`):
```
--color-bg: #0a0a0f
--color-surface: #12121a
--color-surface2: #1a1a26
--color-border: #2a2a3a
--color-gold: #c89b3c
--color-gold-light: #e8bf6a
--color-text: #d4c5a0
--color-text-muted: #7a7060
--color-green: #4caf7d
--color-red: #e05a5a
```
Custom checkbox: `.wf-checkbox` — gold when checked.
Progress bar: `.progress-bar-bg` + `.progress-bar-fill` — gradient gold.
Section tags: `.section-tag.tag-founder` (orange), `.tag-old` (grey), `.tag-extra` (red-grey).
