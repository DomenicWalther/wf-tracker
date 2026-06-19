import { signal } from '@angular/core';

export interface ToggleSet {
  has: (key: string) => boolean;
  toggle: (key: string) => void;
  /** Replaces the entire set with exactly `keys` (used by search-driven open-all). */
  set: (keys: string[]) => void;
}

/**
 * Creates a reactive Set<string> with `has` and `toggle` helpers.
 * Replaces the repeated `signal<Set<string>>` + manual update pattern in
 * gear, incarnon, lich-gear, and checklist components.
 *
 * @param initial  Optional initial set of open keys.
 */
export function createToggleSet(initial: string[] = []): ToggleSet {
  const _set = signal<Set<string>>(new Set(initial));

  return {
    has: (key: string) => _set().has(key),
    toggle: (key: string) => {
      _set.update(s => {
        const next = new Set(s);
        if (next.has(key)) next.delete(key); else next.add(key);
        return next;
      });
    },
    set: (keys: string[]) => _set.set(new Set(keys)),
  };
}
