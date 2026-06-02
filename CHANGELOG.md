# Changelog

## [1.3.0] — 2026-06-02

### Features

- **Pinned Bar** — new configurable floating bar that can display World State cycles and/or a Checklist widget; toggle and reorder widgets in Settings
- **Mobile Layout** — fully responsive layout; sidebar collapses and all tables/panels adapt to small screens
- **Neutral-Dark Theme** — added a second dark theme variant; sidebar now has a theme-toggle button
- **Command Palette** — upgraded to multi-word fuzzy search; item index now includes weapons, gear, mods, arcanes, and checklist tasks
- **Sidebar Off-Badges** — section icons in the collapsed sidebar show a badge when the section has incomplete items
- **World State: Compact Mode** — toggleable compact view for the world-state panel; individual cycle rows can be hidden via settings
- **Gear: Variant Families** — weapon variants are grouped into collapsible family rows with shared upgrade columns, reducing visual noise
- **Tracker Table: Row Toggle** — each tracker row now has a toggle button to expand sub-checkboxes; multi-cell sub-checkbox layout supported
- **ExilusAdapter Tracking** — dedicated toggle in Settings and a tracked column in the gear table for Exilus Adapter slots
- **Settings: Pinned Bar Config** — choose which widgets appear in the pinned bar and configure their display options

### Fixes

- **Arcanes / Mods** — per-rank tracking now works correctly for Psycho and Hoarder mode items
- **Dashboard Totals** — section totals respect active settings (e.g. exilusAdapter toggle); replaced emoji icons with Lucide icons
- **Data: Arcane Sections** — reorganized arcane categories; corrected misplaced entries
- **Data: Weapons** — removed Sirocco from Primary Weapons (incorrect category); fixed Sporothrix typo; removed duplicate entries
- **Styles** — replaced all hardcoded hex color values with CSS custom properties for consistent theming
- **World State** — HTTP errors are now caught and surfaced gracefully instead of breaking the panel

### Content

- Checklist task descriptions rewritten in their original in-game phrasing

### Internal

- Extracted `TaskChecklistService` from the checklist component
- Shared `checklist.utils` helpers used across all list pages
- Gear columns config, gear-variants logic, and toggle-set utilities extracted into reusable modules
- `totalTrackable` computed reactively; tracker mutations centralized
- `fuzzyScore` promoted to a shared exported utility
- LF line endings enforced project-wide
- SPA redirect file added for client-side routing on static hosts
