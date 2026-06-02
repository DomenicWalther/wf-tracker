import { ChecklistGroup } from '../models/tracker.models';

/**
 * Title-cases a raw data-key string by capitalising the first letter of each
 * space-separated word.  E.g. "prime access" → "Prime Access".
 */
export function titleCase(s: string): string {
  return s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Builds flat ChecklistGroups from a Record<groupKey, string[]> data shape.
 *
 * @param raw     The raw data record (e.g. d.arcanes, d.relics, …).
 * @param prefix  The storage-key prefix for each item (e.g. 'arcane:', 'relic:').
 * @param isChecked  Callback that returns the current checked state for a key.
 */
export function buildFlatGroups(
  raw: Record<string, string[]> | null | undefined,
  prefix: string,
  isChecked: (key: string) => boolean,
): ChecklistGroup[] {
  if (!raw) return [];
  return Object.entries(raw).map(([group, items]) => ({
    name: titleCase(group),
    items: items.map(name => ({
      key: prefix + name,
      label: name,
      checked: isChecked(prefix + name),
    })),
  }));
}

/**
 * Applies a bulk-change: toggles each key that does not already match `value`.
 */
export function applyBulkChange(
  event: { keys: string[]; value: boolean },
  isChecked: (key: string) => boolean,
  toggle: (key: string) => void,
): void {
  for (const k of event.keys) {
    if (isChecked(k) !== event.value) toggle(k);
  }
}
