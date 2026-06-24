import { describe, it, expect } from 'vitest';
import { fuzzyScore, similarity, findBestMatch } from './fuzzy-match';

describe('fuzzyScore', () => {
  it('returns 0 for an empty query', () => {
    expect(fuzzyScore('Braton Prime', '')).toBe(0);
  });

  it('scores exact match at 100', () => {
    expect(fuzzyScore('braton', 'braton')).toBe(100);
  });

  it('scores exact match case-insensitively at 100', () => {
    expect(fuzzyScore('Braton', 'braton')).toBe(100);
  });

  it('scores starts-with match at 80', () => {
    // Single token "braton" — "braton prime" starts with it but is not equal to it → 80
    expect(fuzzyScore('Braton Prime', 'braton')).toBe(80);
  });

  it('scores word-start match at 60 for a later word', () => {
    // "prime" is not at the start of the full string but begins a word after the split
    expect(fuzzyScore('Braton Prime', 'prime')).toBe(60);
  });

  it('scores substring match at 40 when not at a word boundary', () => {
    // "ton" sits inside "braton" — no word starts with it
    expect(fuzzyScore('Braton', 'ton')).toBe(40);
  });

  it('returns 0 for a non-matching query', () => {
    expect(fuzzyScore('Braton', 'xyz')).toBe(0);
  });

  it('multi-word query returns average of per-token scores when all tokens match', () => {
    // token "braton": "braton prime" starts with "braton" → 80
    // token "prime":  word-start match → 60
    // average = Math.round((80 + 60) / 2) = 70
    expect(fuzzyScore('Braton Prime', 'braton prime')).toBe(70);
  });

  it('multi-word query returns 0 if any token does not match', () => {
    expect(fuzzyScore('Braton Prime', 'braton xyz')).toBe(0);
  });

  it('treats hyphens as word separators — word after hyphen counts as word start', () => {
    // "MK1-Braton" → words are ["mk1", "braton"]; "braton" is a word start → 60
    expect(fuzzyScore('MK1-Braton', 'braton')).toBe(60);
  });

  it('matches the query token against a lowercased text — query must already be lowercase', () => {
    // singleTokenScore lowercases the text but not the token.
    // A lowercase query "prime" correctly matches a word start in "Vectis Prime".
    expect(fuzzyScore('Vectis Prime', 'prime')).toBe(60);
    // An uppercase token "PRIME" does NOT match because only the text side is lowercased.
    expect(fuzzyScore('Vectis Prime', 'PRIME')).toBe(0);
  });
});

describe('similarity', () => {
  it('returns 1 for identical strings', () => {
    expect(similarity('Braton', 'Braton')).toBe(1);
  });

  it('returns 1 for strings that differ only by case', () => {
    expect(similarity('BRATON', 'braton')).toBe(1);
  });

  it('returns 1 for strings that differ only by surrounding whitespace', () => {
    expect(similarity('  Braton  ', 'Braton')).toBe(1);
  });

  it('returns 1 for two empty strings', () => {
    expect(similarity('', '')).toBe(1);
  });

  it('returns a high score for a single-character substitution', () => {
    // "Soma" vs "Some" — levenshtein 1, maxLen 4 → 1 - 1/4 = 0.75
    expect(similarity('Soma', 'Some')).toBeCloseTo(0.75, 5);
  });

  it('returns a high score for a single insertion (typo)', () => {
    // "Braton" vs "Bratons" — levenshtein 1, maxLen 7 → 1 - 1/7 ≈ 0.857
    const score = similarity('Braton', 'Bratons');
    expect(score).toBeGreaterThan(0.85);
    expect(score).toBeLessThan(1);
  });

  it('returns a low score for completely different strings', () => {
    expect(similarity('Braton', 'Zymos')).toBeLessThan(0.4);
  });

  it('is symmetric', () => {
    expect(similarity('Soma Prime', 'Some Prime')).toBeCloseTo(
      similarity('Some Prime', 'Soma Prime'),
      10,
    );
  });
});

describe('findBestMatch', () => {
  it('returns null when no candidate meets the default threshold (0.75)', () => {
    expect(findBestMatch('Braton', ['Zymos', 'Boltor', 'Soma'])).toBeNull();
  });

  it('returns the exact candidate with score 1 when present', () => {
    const result = findBestMatch('Braton', ['Braton Prime', 'Braton', 'Braton Vandal']);
    expect(result).not.toBeNull();
    expect(result!.item).toBe('Braton');
    expect(result!.score).toBe(1);
  });

  it('picks the highest-scoring candidate when multiple exceed the threshold', () => {
    const result = findBestMatch('Soma', ['Soma Prime', 'Soma', 'Grinlok']);
    expect(result!.item).toBe('Soma');
  });

  it('respects a lower custom threshold and returns a fuzzy match', () => {
    // "Boltor" vs "Bolton" — levenshtein 2, maxLen 6 → 1 - 2/6 ≈ 0.667
    const result = findBestMatch('Boltor', ['Bolton'], 0.5);
    expect(result).not.toBeNull();
    expect(result!.item).toBe('Bolton');
    expect(result!.score).toBeGreaterThan(0.5);
  });

  it('returns null for an empty candidates list', () => {
    expect(findBestMatch('Braton', [])).toBeNull();
  });

  it('returns null when all candidates are below a strict custom threshold', () => {
    // "Braton" vs "Braton Prime" has similarity < 1 but > 0.75; at threshold 0.99 only exact wins
    const result = findBestMatch('Braton', ['Braton Prime', 'Braton Vandal'], 0.99);
    expect(result).toBeNull();
  });
});
