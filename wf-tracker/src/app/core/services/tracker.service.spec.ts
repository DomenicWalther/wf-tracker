import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection, signal } from '@angular/core';
import { TrackerService } from './tracker.service';
import { DataService } from './data.service';
import { HonoriaService } from './honoria.service';
import { DEFAULT_SETTINGS, DEFAULT_SECTION_TOGGLES, TrackerData } from '../models/tracker.models';

// ─── In-memory localStorage fake ─────────────────────────────────────────────

function makeLocalStorageFake(): Storage {
  let store: Record<string, string> = {};
  return {
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
  } as Storage;
}

// ─── Minimal TrackerData fixture ──────────────────────────────────────────────

const MOCK_DATA: TrackerData = {
  quests: ['The War Within', 'The New War'],
  gear: {},
  lichGear: {},
  incarnon: [],
  arcanes: {
    warframe: ['Energize', 'Grace'],
    operator: ['Magus Vigor'],
  },
  mods: [],
  atragraph: [],
  subsume: [],
  railjack: { intrinsics: [], components: [] },
  relics: {},
  blueprints: {},
  items: {},
  cosmetics: {},
  collectable: {},
  accolade: {},
  decorations: {},
  codex: {},
  market: {},
  extra: {},
  bigGoals: [],
  versionLog: [],
  modularGear: {},
  settingsDefinitions: {},
};

// ─── Test setup ───────────────────────────────────────────────────────────────

function setupTestBed(storage: Storage): TrackerService {
  vi.stubGlobal('localStorage', storage);

  const mockDataService = { data: signal(MOCK_DATA) };
  const mockHonoria = {
    completed: vi.fn(() => 0),
    total: 50,
  };

  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      TrackerService,
      { provide: DataService, useValue: mockDataService },
      { provide: HonoriaService, useValue: mockHonoria },
    ],
  });

  return TestBed.inject(TrackerService);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('TrackerService', () => {
  let storage: Storage;
  let service: TrackerService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    storage = makeLocalStorageFake();
    service = setupTestBed(storage);
  });

  // ── toggle ─────────────────────────────────────────────────────────────────

  describe('toggle()', () => {
    it('sets an unchecked key to true', () => {
      service.toggle('quest:The War Within');
      expect(service.isChecked('quest:The War Within')).toBe(true);
    });

    it('flips a checked key back to false', () => {
      service.toggle('quest:The War Within');
      service.toggle('quest:The War Within');
      expect(service.isChecked('quest:The War Within')).toBe(false);
    });

    it('toggling one key does not affect other keys', () => {
      service.toggle('quest:The War Within');
      expect(service.isChecked('quest:The New War')).toBe(false);
    });
  });

  // ── setNumber ──────────────────────────────────────────────────────────────

  describe('setNumber()', () => {
    it('stores a numeric value retrievable via getNumber()', () => {
      service.setNumber('endo:total', 9000);
      expect(service.getNumber('endo:total')).toBe(9000);
    });

    it('overwrites an existing numeric value', () => {
      service.setNumber('endo:total', 9000);
      service.setNumber('endo:total', 100);
      expect(service.getNumber('endo:total')).toBe(100);
    });

    it('returns the supplied defaultValue when the key is absent', () => {
      expect(service.getNumber('nonexistent', 42)).toBe(42);
    });
  });

  // ── setText ────────────────────────────────────────────────────────────────

  describe('setText()', () => {
    it('stores a string value retrievable via getText()', () => {
      service.setText('note:arcane', 'need 21 copies');
      expect(service.getText('note:arcane')).toBe('need 21 copies');
    });

    it('overwrites an existing text value', () => {
      service.setText('note:arcane', 'first');
      service.setText('note:arcane', 'second');
      expect(service.getText('note:arcane')).toBe('second');
    });

    it('returns an empty string when the key is absent', () => {
      expect(service.getText('nonexistent')).toBe('');
    });
  });

  // ── mergeWithDefaults ──────────────────────────────────────────────────────

  describe('mergeWithDefaults() via importState()', () => {
    it('preserves existing checkbox keys from the imported object', () => {
      const partial = JSON.stringify({
        checkboxes: { 'quest:The War Within': true },
      });
      service.importState(partial);
      expect(service.isChecked('quest:The War Within')).toBe(true);
    });

    it('fills missing sectionToggles from defaults', () => {
      // Import a state with no sectionToggles — defaults should apply.
      const partial = JSON.stringify({ checkboxes: {} });
      service.importState(partial);
      expect(service.sectionToggles()).toEqual(
        expect.objectContaining(DEFAULT_SECTION_TOGGLES),
      );
    });

    it('merges nested settings sub-objects without clobbering unspecified keys', () => {
      const partial = JSON.stringify({
        settings: { gear: { reactor: true } },
      });
      service.importState(partial);
      const gearSettings = service.settings().gear;
      // The explicit override arrives.
      expect(gearSettings.reactor).toBe(true);
      // A key absent from the import retains its default value.
      expect(gearSettings.primeOnlyGear).toBe(DEFAULT_SETTINGS.gear.primeOnlyGear);
    });

    it('rejects non-object JSON payloads without crashing', () => {
      // Arrays are rejected; state should remain intact.
      service.toggle('quest:The War Within');
      service.importState('["not","an","object"]');
      expect(service.isChecked('quest:The War Within')).toBe(true);
    });

    it('rejects invalid JSON without crashing', () => {
      service.toggle('quest:The War Within');
      service.importState('{bad json}');
      expect(service.isChecked('quest:The War Within')).toBe(true);
    });
  });

  // ── migrateArcaneKeys ──────────────────────────────────────────────────────

  describe('migrateArcaneKeys()', () => {
    it('remaps a legacy groupless arcane:owned key onto the group-scoped key', () => {
      // Seed legacy key directly into storage before the service loads.
      const legacyState = {
        checkboxes: { 'arcane:Energize': true },
        numberValues: {},
        textValues: {},
        settings: DEFAULT_SETTINGS,
        sectionToggles: DEFAULT_SECTION_TOGGLES,
        personalGoals: [],
        todoItems: [],
        bigGoals: [],
        bigGoalsSeeded: false,
      };
      storage.setItem('wf-tracker-state', JSON.stringify(legacyState));

      // Re-create the service so it loads the legacy state and runs migration.
      TestBed.resetTestingModule();
      const freshService = setupTestBed(storage);
      TestBed.flushEffects(); // flush effect() so migration runs synchronously

      // After migration the groupless key should be gone.
      expect(freshService.isChecked('arcane:Energize')).toBe(false);
      // And the group-scoped key should carry the value.
      expect(freshService.isChecked('arcane:warframe:Energize')).toBe(true);
    });

    it('remaps a legacy arcane:maxed suffix correctly', () => {
      const legacyState = {
        checkboxes: { 'arcane:Energize:maxed': true },
        numberValues: {},
        textValues: {},
        settings: DEFAULT_SETTINGS,
        sectionToggles: DEFAULT_SECTION_TOGGLES,
        personalGoals: [],
        todoItems: [],
        bigGoals: [],
        bigGoalsSeeded: false,
      };
      storage.setItem('wf-tracker-state', JSON.stringify(legacyState));

      TestBed.resetTestingModule();
      const freshService = setupTestBed(storage);
      TestBed.flushEffects();

      expect(freshService.isChecked('arcane:Energize:maxed')).toBe(false);
      expect(freshService.isChecked('arcane:warframe:Energize:maxed')).toBe(true);
    });

    it('does not touch keys that already use the group-scoped format', () => {
      // 'warframe' is a known group key in MOCK_DATA.arcanes, so this key is already modern.
      const modernState = {
        checkboxes: { 'arcane:warframe:Energize': true },
        numberValues: {},
        textValues: {},
        settings: DEFAULT_SETTINGS,
        sectionToggles: DEFAULT_SECTION_TOGGLES,
        personalGoals: [],
        todoItems: [],
        bigGoals: [],
        bigGoalsSeeded: false,
      };
      storage.setItem('wf-tracker-state', JSON.stringify(modernState));

      TestBed.resetTestingModule();
      const freshService = setupTestBed(storage);
      TestBed.flushEffects();

      expect(freshService.isChecked('arcane:warframe:Energize')).toBe(true);
    });
  });

  // ── countProgress ──────────────────────────────────────────────────────────

  describe('countProgress()', () => {
    it('returns 0/0/0 for an empty key list', () => {
      expect(service.countProgress([])).toEqual({ completed: 0, total: 0, percentage: 0 });
    });

    it('counts only the checked keys among the supplied list', () => {
      service.toggle('quest:The War Within');
      const result = service.countProgress(['quest:The War Within', 'quest:The New War']);
      expect(result).toEqual({ completed: 1, total: 2, percentage: 50 });
    });

    it('returns 100% when all supplied keys are checked', () => {
      service.toggle('quest:The War Within');
      service.toggle('quest:The New War');
      const result = service.countProgress(['quest:The War Within', 'quest:The New War']);
      expect(result.percentage).toBe(100);
    });
  });

  // ── sectionProgress ────────────────────────────────────────────────────────

  describe('sectionProgress()', () => {
    it('counts checked quests correctly against total in mock data', () => {
      service.toggle('quest:The War Within');
      const result = service.sectionProgress('quests');
      expect(result.completed).toBe(1);
      expect(result.total).toBe(2);
    });

    it('reflects additional toggles: completed increases after another toggle', () => {
      service.toggle('quest:The War Within');
      const before = service.sectionProgress('quests');
      service.toggle('quest:The New War');
      const after = service.sectionProgress('quests');
      expect(after.completed).toBe(before.completed + 1);
    });
  });

  // ── totalTrackable computed ────────────────────────────────────────────────

  describe('totalTrackable computed', () => {
    it('excludes a section from the total when its toggle is off', () => {
      // Enable quests to get its contribution.
      service.updateSectionToggles({ ...DEFAULT_SECTION_TOGGLES, quests: true });
      const withQuests = service.totalTrackable();

      service.updateSectionToggles({ ...DEFAULT_SECTION_TOGGLES, quests: false });
      const withoutQuests = service.totalTrackable();

      expect(withQuests.total).toBeGreaterThan(withoutQuests.total);
    });

    it('includes honoria total when its toggle is on', () => {
      service.updateSectionToggles({ ...DEFAULT_SECTION_TOGGLES, honoria: true });
      // The mock HonoriaService has total = 50.
      expect(service.totalTrackable().total).toBeGreaterThanOrEqual(50);
    });

    it('excludes honoria when its toggle is off', () => {
      service.updateSectionToggles({ ...DEFAULT_SECTION_TOGGLES, honoria: false });
      const withoutHonoria = service.totalTrackable().total;

      service.updateSectionToggles({ ...DEFAULT_SECTION_TOGGLES, honoria: true });
      const withHonoria = service.totalTrackable().total;

      expect(withHonoria).toBeGreaterThan(withoutHonoria);
    });
  });

  // ── localStorage persistence ───────────────────────────────────────────────

  describe('localStorage persistence', () => {
    it('persists state so a freshly created service instance sees the same data', () => {
      service.toggle('quest:The War Within');
      service.setText('note:test', 'hello');
      service.setNumber('plat:total', 1234);

      // Simulate a page reload: tear down and recreate against the SAME storage.
      TestBed.resetTestingModule();
      const reloaded = setupTestBed(storage);

      expect(reloaded.isChecked('quest:The War Within')).toBe(true);
      expect(reloaded.getText('note:test')).toBe('hello');
      expect(reloaded.getNumber('plat:total')).toBe(1234);
    });

    it('writes to localStorage after every state mutation', () => {
      service.toggle('quest:The New War');
      const raw = storage.getItem('wf-tracker-state');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string) as { checkboxes: Record<string, boolean> };
      expect(parsed.checkboxes['quest:The New War']).toBe(true);
    });
  });

  // ── export / import roundtrip ──────────────────────────────────────────────

  describe('export/import roundtrip', () => {
    it('exportState() returns valid JSON', () => {
      service.toggle('quest:The War Within');
      expect(() => JSON.parse(service.exportState())).not.toThrow();
    });

    it('roundtrips checkbox state through export then import', () => {
      service.toggle('quest:The War Within');
      service.toggle('quest:The New War');
      const exported = service.exportState();

      // Reset to a clean service on fresh storage.
      TestBed.resetTestingModule();
      const freshService = setupTestBed(makeLocalStorageFake());
      freshService.importState(exported);

      expect(freshService.isChecked('quest:The War Within')).toBe(true);
      expect(freshService.isChecked('quest:The New War')).toBe(true);
    });

    it('roundtrips settings through export then import', () => {
      service.updateSettings({ ...DEFAULT_SETTINGS, isFounder: true });
      const exported = service.exportState();

      TestBed.resetTestingModule();
      const freshService = setupTestBed(makeLocalStorageFake());
      freshService.importState(exported);

      expect(freshService.settings().isFounder).toBe(true);
    });
  });

  // ── resetSection ──────────────────────────────────────────────────────────

  describe('resetSection()', () => {
    it('removes all keys matching the given prefix', () => {
      service.toggle('quest:The War Within');
      service.toggle('quest:The New War');
      service.toggle('gear:SomeWeapon:mastery');

      service.resetSection('quest:');

      expect(service.isChecked('quest:The War Within')).toBe(false);
      expect(service.isChecked('quest:The New War')).toBe(false);
      // Unrelated prefix should be untouched.
      expect(service.isChecked('gear:SomeWeapon:mastery')).toBe(true);
    });
  });
});
