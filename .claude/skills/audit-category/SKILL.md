---
name: audit-category
description: Audit a tracker-data.json category against the Warframe Wiki MCP to check completeness and correctness. Use when asked to "check if this category is correct", "audit the mods list", "verify warframes are up to date", "is the arcanes section complete", or any similar request to validate tracker data against the wiki.
---

# Category Audit Skill

Compares a category in `wf-tracker/public/assets/tracker-data.json` against live Warframe Wiki data (via MCP tools) and reports what's missing, extra, or miscategorized.

## Process

### 1. Read tracker-data.json

```
Read: wf-tracker/public/assets/tracker-data.json
```

Navigate to the requested category. The top-level keys and their shapes:

| Category arg | JSON path | Item shape |
|---|---|---|
| `quests` | `.quests` | `string[]` |
| `gear.<type>` | `.gear.<type>` | `{ name, isFounderOnly? }[]` |
| `arcanes.<type>` | `.arcanes.<type>` | `string[]` |
| `mods` | `.mods` | `{ name, maxRank, category }[]` |
| `mods.<Category>` | `.mods` filtered by `.category` | same |
| `lichGear.<type>` | `.lichGear.<type>` | `string[]` |
| `items.<type>` | `.items.<type>` | `string[]` |
| `cosmetics.<type>.<sub>` | `.cosmetics.<type>.<sub>` | `string[]` |
| `collectable.<type>` | `.collectable.<type>` | `string[]` |
| `decorations.<type>` | `.decorations.<type>` | `string[]` |
| `codex.<type>` | `.codex.<type>` | `string[]` |
| `market.<type>` | `.market.<type>` | `string[]` |
| `extra.<type>` | `.extra.<type>` | `string[]` |
| `modularGear.<type>` | `.modularGear.<type>` | `string[]` |
| `relics.<tier>` | `.relics.<tier>` | `string[]` |
| `subsume` | `.subsume` | `{ warframe, ability }[]` |

### 2. Fetch wiki data via MCP

Use `mcp__wf-wiki__*` tools — **never** warframe.fandom.com, never training-data knowledge.

Common lookup patterns:

**Category members** (use for lists like warframes, weapons, mods by type):
```
mcp__wf-wiki__get_category_members({ category: "<Wiki Category Name>" })
```

**Single page** (use for details like mod maxRank, arcane tier, subsume abilities):
```
mcp__wf-wiki__get_wiki_page({ title: "<Page Title>" })
```

**Search** (use when the exact category name is uncertain):
```
mcp__wf-wiki__search_wiki({ query: "<search term>" })
```

Useful wiki category names for common tracker categories:

| Tracker category | Wiki category / approach |
|---|---|
| `quests` | `get_category_members({ category: "Quests" })` |
| `gear.warframes` | `get_category_members({ category: "Warframes" })` |
| `gear.primaryWeapons` | `get_category_members({ category: "Primary Weapons" })` |
| `gear.secondaryWeapons` | `get_category_members({ category: "Secondary Weapons" })` |
| `gear.meleeWeapons` | `get_category_members({ category: "Melee Weapons" })` |
| `gear.companions` | `get_category_members({ category: "Companions" })` |
| `arcanes.*` | `get_category_members({ category: "Arcanes" })` |
| `mods` / `mods.<Cat>` | `get_category_members({ category: "Mods" })` or `get_category_members({ category: "<Cat> Mods" })` |
| `subsume` | `get_wiki_page({ title: "Helminth" })` for the subsume list |

If the wiki category name is unclear, use `search_wiki` first to find the right category, then `get_category_members`.

### 3. Normalize and compare

- Normalize both sides: trim whitespace, ignore case for comparison, but report the exact wiki-casing as the canonical form.
- For `mods`: also verify `maxRank` and `category` field against the wiki page for each mod.
- For `gear`: flag items where `isFounderOnly` may be wrong (Excalibur, Skana, Lato are Founder-only).

### 4. Report findings

Structure the report as:

```
## Audit: <Category> (<date>)

### ✅ Summary
- Tracker count: N  
- Wiki count: N  
- Missing from tracker: N  
- Extra in tracker (not on wiki): N  
- Field mismatches: N  

### ❌ Missing from tracker
- <Item name> (wiki page: <url hint if known>)

### ⚠️ Extra in tracker (not found on wiki)
- <Item name> — possible rename, deletion, or categorization error

### 🔧 Field mismatches
- <Item name>: tracker has maxRank=X, wiki says Y

### ✅ Looks correct
Everything else matched.
```

If the wiki returns pagination (large categories), fetch all pages before comparing.

## Notes

- The mod `category` field must match one of the values used in `mods.component.ts`: `Warframe`, `Aura`, `Primary`, `Secondary`, `Melee`, `Stance`, `Companion`, `Archwing`, `Necramech`, `K-Drive`, `Railjack`, `Conclave`.
- Founder-only gear: Excalibur Prime, Skana Prime, Lato Prime — `isFounderOnly: true`.
- The wiki may include subcategory pages or redirect pages — filter those out (pages whose title starts with "Category:" or ends with "(Conclave)" unless auditing Conclave).
- Always use the wiki as the source of truth. If the tracker has something the wiki doesn't, flag it as "extra" rather than assuming the wiki is wrong.
