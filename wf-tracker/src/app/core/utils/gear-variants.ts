/**
 * Gear "variant" families. Many Warframe weapons/frames ship as an upgraded
 * variant that shares its base lineage with a plainer counterpart. For
 * completion tracking each variant earns its own Mastery, but you only ever
 * fully build (Reactor / Forma / etc.) ONE variant of the family.
 *
 * So a family collapses to a single row: Mastery is tracked per variant, while
 * the upgrade columns are a single shared toggle keyed on the family base name.
 */

/** Suffix families where the suffixed item is the keeper — "Braton Prime". */
const KEEPER_SUFFIXES = ['Prime', 'Vandal', 'Wraith', 'Umbra'];

/** Prefix families where the prefixed item is the keeper — "Kuva Karak". */
const KEEPER_PREFIXES = [
  'Kuva', 'Tenet', 'Coda', 'Prisma', 'Dex', 'Mara', 'Carmine', 'Ceti',
  'Telos', 'Rakta', 'Sancti', 'Secura', 'Synoid', 'Vaykor',
];

/** Inverted families where the modified item is the weaker one — "MK1-Braton", "Broken War". */
const REDUNDANT_PREFIXES = ['MK1-', 'Broken '];

export interface GearFamily {
  /** Base name that the family is keyed on (e.g. "Hek"). */
  id: string;
  /** Member item names, base first (e.g. ["Hek", "Kuva Hek", "Vaykor Hek"]). */
  members: string[];
}

/**
 * Resolves the family id (base name) for a single item, given the set of names
 * present. An affix is only stripped when the resulting base actually exists in
 * `names`, so unrelated weapons (e.g. "Kuva Bramma", which has no "Bramma") stay
 * standalone.
 */
export function gearFamilyId(name: string, names: Set<string>): string {
  for (const suffix of KEEPER_SUFFIXES) {
    if (name.endsWith(' ' + suffix)) {
      const base = name.slice(0, -(suffix.length + 1));
      if (names.has(base)) return base;
    }
  }
  for (const prefix of KEEPER_PREFIXES) {
    if (name.startsWith(prefix + ' ')) {
      const base = name.slice(prefix.length + 1);
      if (names.has(base)) return base;
    }
  }
  for (const prefix of REDUNDANT_PREFIXES) {
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      const base = name.slice(prefix.length);
      if (names.has(base)) return base;
    }
  }
  return name;
}

/** Short label for a member within its family ("Base", "Prime", "Kuva", "MK1"…). */
export function gearVariantLabel(name: string, familyId: string): string {
  if (name === familyId) return 'Base';
  for (const suffix of KEEPER_SUFFIXES) if (name === familyId + ' ' + suffix) return suffix;
  for (const prefix of KEEPER_PREFIXES) if (name === prefix + ' ' + familyId) return prefix;
  if (/^mk1-/i.test(name)) return 'MK1';
  if (name.startsWith('Broken ')) return 'Broken';
  return name.replace(familyId, '').trim() || name;
}

/** Groups item names into variant families (base first within each family). */
export function buildGearFamilies(itemNames: string[]): GearFamily[] {
  const names = new Set(itemNames);
  const map = new Map<string, string[]>();
  const order: string[] = [];
  for (const n of itemNames) {
    const id = gearFamilyId(n, names);
    if (!map.has(id)) { map.set(id, []); order.push(id); }
    map.get(id)!.push(n);
  }
  return order.map(id => {
    const members = map.get(id)!;
    members.sort((a, b) => (a === id ? -1 : 0) - (b === id ? -1 : 0));
    return { id, members };
  });
}

/**
 * Counts completion for a gear section under the grouped model: one Mastery cell
 * per variant, plus one shared cell per upgrade column per family.
 */
export function countGearSection(
  itemNames: string[],
  upgradeColKeys: string[],
  isChecked: (name: string, colKey: string) => boolean,
): { completed: number; total: number } {
  let total = 0, completed = 0;
  for (const family of buildGearFamilies(itemNames)) {
    for (const member of family.members) {
      total++;
      if (isChecked(member, 'mastery')) completed++;
    }
    for (const col of upgradeColKeys) {
      total++;
      if (isChecked(family.id, col)) completed++;
    }
  }
  return { completed, total };
}
