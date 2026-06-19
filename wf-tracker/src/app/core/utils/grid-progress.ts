import { SectionProgress } from './section-progress';

/**
 * Tallies a per-group grid of (row × column) tracker cells into a
 * `{ completed, total }` pair — the count shown next to a collapsible section
 * header. Replaces the hand-rolled nested loop duplicated across relics, mods,
 * arcanes and lich-gear.
 *
 * @param rows     Rows in the group (only `name` is read).
 * @param cols     Columns in the group (only `key` is read).
 * @param keyOf    Builds the storage key for a (rowName, colKey) cell.
 * @param isChecked  Current checked state for a storage key.
 * @param skip     Optional predicate to exclude a cell from the tally
 *                 (e.g. mod ranks above a mod's max rank).
 */
export function gridProgress(
  rows: readonly { name: string }[],
  cols: readonly { key: string }[],
  keyOf: (rowName: string, colKey: string) => string,
  isChecked: (key: string) => boolean,
  skip?: (rowName: string, colKey: string) => boolean,
): SectionProgress {
  let completed = 0;
  let total = 0;
  for (const row of rows) {
    for (const col of cols) {
      if (skip?.(row.name, col.key)) continue;
      total++;
      if (isChecked(keyOf(row.name, col.key))) completed++;
    }
  }
  return { completed, total };
}
