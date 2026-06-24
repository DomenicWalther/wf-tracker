import { describe, it, expect } from 'vitest';
import { gearFamilyId, gearVariantLabel, buildGearFamilies, countGearSection } from './gear-variants';

// ---------------------------------------------------------------------------
// gearFamilyId
// ---------------------------------------------------------------------------

describe('gearFamilyId', () => {
  it('returns the item name unchanged when it has no affix variant in the set', () => {
    const names = new Set(['Braton', 'Soma', 'Boltor']);
    expect(gearFamilyId('Braton', names)).toBe('Braton');
  });

  it('strips a KEEPER_SUFFIX (Prime) when the base exists in the set', () => {
    const names = new Set(['Braton', 'Braton Prime']);
    expect(gearFamilyId('Braton Prime', names)).toBe('Braton');
  });

  it('strips a KEEPER_SUFFIX (Vandal) when the base exists', () => {
    const names = new Set(['Lato', 'Lato Vandal', 'Lato Prime']);
    expect(gearFamilyId('Lato Vandal', names)).toBe('Lato');
  });

  it('strips a KEEPER_SUFFIX (Wraith) when the base exists', () => {
    const names = new Set(['Strun', 'Strun Wraith']);
    expect(gearFamilyId('Strun Wraith', names)).toBe('Strun');
  });

  it('strips a KEEPER_SUFFIX (Umbra) when the base exists', () => {
    const names = new Set(['Excalibur', 'Excalibur Umbra']);
    expect(gearFamilyId('Excalibur Umbra', names)).toBe('Excalibur');
  });

  it('strips a KEEPER_PREFIX (Kuva) when the base exists', () => {
    const names = new Set(['Karak', 'Kuva Karak']);
    expect(gearFamilyId('Kuva Karak', names)).toBe('Karak');
  });

  it('strips a KEEPER_PREFIX (Tenet) when the base exists', () => {
    const names = new Set(['Cycron', 'Tenet Cycron']);
    expect(gearFamilyId('Tenet Cycron', names)).toBe('Cycron');
  });

  it('strips a KEEPER_PREFIX (Telos) when the base exists', () => {
    const names = new Set(['Boltor', 'Telos Boltor']);
    expect(gearFamilyId('Telos Boltor', names)).toBe('Boltor');
  });

  it('does NOT strip a KEEPER_PREFIX when the base is absent from the set', () => {
    // "Kuva Bramma" has no plain "Bramma" counterpart — stays standalone
    const names = new Set(['Kuva Bramma', 'Kuva Nukor']);
    expect(gearFamilyId('Kuva Bramma', names)).toBe('Kuva Bramma');
  });

  it('strips a REDUNDANT_PREFIX (MK1-) when the base exists', () => {
    const names = new Set(['Braton', 'MK1-Braton']);
    expect(gearFamilyId('MK1-Braton', names)).toBe('Braton');
  });

  it('strips a REDUNDANT_PREFIX (Broken ) when the base exists', () => {
    const names = new Set(['War', 'Broken War']);
    expect(gearFamilyId('Broken War', names)).toBe('War');
  });

  it('does NOT strip a REDUNDANT_PREFIX when the base is absent', () => {
    // No plain "Scepter" in the set
    const names = new Set(['Broken Scepter']);
    expect(gearFamilyId('Broken Scepter', names)).toBe('Broken Scepter');
  });
});

// ---------------------------------------------------------------------------
// gearVariantLabel
// ---------------------------------------------------------------------------

describe('gearVariantLabel', () => {
  it('returns "Base" for the item that matches the family id', () => {
    expect(gearVariantLabel('Braton', 'Braton')).toBe('Base');
  });

  it('returns the suffix name for KEEPER_SUFFIX variants', () => {
    expect(gearVariantLabel('Braton Prime', 'Braton')).toBe('Prime');
    expect(gearVariantLabel('Lato Vandal', 'Lato')).toBe('Vandal');
    expect(gearVariantLabel('Strun Wraith', 'Strun')).toBe('Wraith');
    expect(gearVariantLabel('Excalibur Umbra', 'Excalibur')).toBe('Umbra');
  });

  it('returns the prefix name for KEEPER_PREFIX variants', () => {
    expect(gearVariantLabel('Kuva Karak', 'Karak')).toBe('Kuva');
    expect(gearVariantLabel('Tenet Cycron', 'Cycron')).toBe('Tenet');
    expect(gearVariantLabel('Telos Boltor', 'Boltor')).toBe('Telos');
  });

  it('returns "MK1" for MK1-prefixed items', () => {
    expect(gearVariantLabel('MK1-Braton', 'Braton')).toBe('MK1');
  });

  it('returns "Broken" for Broken-prefixed items', () => {
    expect(gearVariantLabel('Broken War', 'War')).toBe('Broken');
  });
});

// ---------------------------------------------------------------------------
// buildGearFamilies
// ---------------------------------------------------------------------------

describe('buildGearFamilies', () => {
  it('groups Prime and base into one family with base first', () => {
    const families = buildGearFamilies(['Braton', 'Braton Prime']);
    expect(families).toHaveLength(1);
    expect(families[0].id).toBe('Braton');
    expect(families[0].members[0]).toBe('Braton');
    expect(families[0].members).toContain('Braton Prime');
  });

  it('groups multiple variants (MK1, base, Prime) under one family', () => {
    const families = buildGearFamilies(['Braton', 'Braton Prime', 'MK1-Braton']);
    expect(families).toHaveLength(1);
    expect(families[0].id).toBe('Braton');
    expect(families[0].members).toHaveLength(3);
  });

  it('keeps standalone items without a matching base as their own family', () => {
    const families = buildGearFamilies(['Kuva Bramma', 'Kuva Nukor']);
    expect(families).toHaveLength(2);
    expect(families.map(f => f.id)).toEqual(['Kuva Bramma', 'Kuva Nukor']);
  });

  it('preserves input order for independent families', () => {
    const families = buildGearFamilies(['Soma', 'Boltor', 'Braton']);
    expect(families.map(f => f.id)).toEqual(['Soma', 'Boltor', 'Braton']);
  });
});

// ---------------------------------------------------------------------------
// countGearSection
// ---------------------------------------------------------------------------

describe('countGearSection', () => {
  it('counts one mastery cell per variant plus one upgrade cell per column per family', () => {
    // Family: Braton (base) + Braton Prime → 2 mastery cells + 1 reactor cell = 3 total
    const items = ['Braton', 'Braton Prime'];
    const { total } = countGearSection(items, ['reactor'], () => false);
    expect(total).toBe(3);
  });

  it('completed counts mastery checks per variant correctly', () => {
    const items = ['Braton', 'Braton Prime'];
    const checked = new Set(['Braton|mastery']);
    const { completed } = countGearSection(
      items,
      ['reactor'],
      (name, col) => checked.has(`${name}|${col}`),
    );
    // Only Braton mastery is checked — Braton Prime mastery and Braton reactor are not
    expect(completed).toBe(1);
  });

  it('shared upgrade column is keyed on the family id (base name), not each variant', () => {
    const items = ['Braton', 'Braton Prime'];
    // Mark the shared reactor column under the family id "Braton"
    const checked = new Set(['Braton|reactor']);
    const { completed } = countGearSection(
      items,
      ['reactor'],
      (name, col) => checked.has(`${name}|${col}`),
    );
    // The reactor cell is shared (1 cell), keyed on "Braton" → 1 completed
    expect(completed).toBe(1);
  });

  it('returns zero completed and correct total when nothing is checked', () => {
    const items = ['Soma', 'Soma Prime'];
    const { completed, total } = countGearSection(
      items,
      ['reactor', 'catalyst'],
      () => false,
    );
    // 2 mastery + 2 upgrade cols × 1 family = 4
    expect(total).toBe(4);
    expect(completed).toBe(0);
  });

  it('handles multiple independent families correctly', () => {
    // Braton family (2 members) + Soma family (1 member), 1 upgrade col each
    const items = ['Braton', 'Braton Prime', 'Soma'];
    const { total } = countGearSection(items, ['reactor'], () => false);
    // Braton family: 2 mastery + 1 reactor = 3; Soma family: 1 mastery + 1 reactor = 2 → total 5
    expect(total).toBe(5);
  });

  it('returns 0 total and 0 completed for empty item list', () => {
    const { completed, total } = countGearSection([], ['reactor'], () => false);
    expect(total).toBe(0);
    expect(completed).toBe(0);
  });

  it('handles no upgrade columns — only mastery cells counted', () => {
    const items = ['Lato', 'Lato Vandal', 'Lato Prime'];
    const { total } = countGearSection(items, [], () => false);
    // 3 mastery cells, 0 upgrade cells
    expect(total).toBe(3);
  });
});
