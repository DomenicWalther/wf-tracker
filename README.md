# WF Tracker

A Warframe completion tracker built with Angular. Track mastery, upgrades, incarnon adapters, arcanes, mods, relics, quests, and more — all in one place.

## Features

- **Gear** — track mastery, forma, catalyst, reactor, and other upgrades across all weapon and Warframe categories
- **Incarnon** — track adapter earned/installed and evolution stage per weapon family
- **Lich Gear** — track ephemera, converted status, and mastery for Kuva and Tenet weapons
- **Arcanes** — track rank and quantity across all arcane categories
- **Mods** — track collected, maxed, and gilded status
- **Relics** — track relic completion by tier and era
- **Quests** — track quest and codex completion
- **Blueprints, Collectables, Cosmetics, Decorations, Railjack, Subsume** — dedicated pages per content type
- **Big Goals & Personal Goals** — custom milestone tracking
- **Command Palette** — fuzzy search across all items with `Ctrl+K`; supports multi-word queries and filters to unchecked items
- **World State** — live Warframe world state with cycle timers
- **Task Checklist** — pinnable in-game task list
- **Pinned Bar** — floating widget bar with configurable world-state and checklist panels

## Tech Stack

- [Angular 21](https://angular.dev) — standalone components, signals, `@if`/`@for` control flow
- [Tailwind CSS 4](https://tailwindcss.com)
- [Lucide Angular](https://lucide.dev) icons
- TypeScript 5.9 with strict mode

## Getting Started

```bash
npm install
npm start       # dev server → http://localhost:4200
npm run build   # production build
npm test        # run tests with Vitest
```
