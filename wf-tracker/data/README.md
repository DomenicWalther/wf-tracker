# Tracker data (source of truth)

Each file here is **one top-level section** of the tracker dataset. These are the
files you edit — e.g. add a weapon in `gear.json`, a relic tier in `relics.json`.

They are merged into the single `public/assets/tracker-data.json` that the app
loads at runtime. **Do not edit `tracker-data.json` directly** — it is generated
and your changes there will be overwritten on the next build.

## Workflow

```bash
# after editing any data/*.json:
npm run data:build      # regenerates public/assets/tracker-data.json
npm run data:check      # verifies the asset is in sync (fails if stale) — for CI
```

`npm start` and `npm run build` run `data:build` automatically (via `prestart` /
`prebuild`), so during normal dev you rarely call it by hand. The merged asset is
committed, so deploys work even if their build command doesn't run the merge.

## Adding a new section

1. Create `data/<key>.json`.
2. Add `<key>` to `SECTION_ORDER` in [`../scripts/build-data.mjs`](../scripts/build-data.mjs)
   (controls top-level key order in the merged file).
3. Add the field to the `TrackerData` interface in
   [`../src/app/core/models/tracker.models.ts`](../src/app/core/models/tracker.models.ts).

The merge script errors if a `data/*.json` file isn't registered in `SECTION_ORDER`,
or if a registered key has no file — so the two can't silently drift.
