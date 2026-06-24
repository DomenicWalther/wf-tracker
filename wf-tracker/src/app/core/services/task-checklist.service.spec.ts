import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import {
  TaskChecklistService,
  SECTIONS,
  CHECKLIST_STORAGE_KEY,
  type TaskSection,
  type TaskState,
} from './task-checklist.service';

// ─── localStorage fake ────────────────────────────────────────────────────────

function makeLocalStorageFake(): Storage {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  } as Storage;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Seed localStorage before the service is constructed. */
function seedStorage(storage: Storage, partial: Partial<TaskState>): void {
  const defaults: TaskState = {
    dailyDate: '', weeklyDate: '', checked: {}, hidden: [], collapsed: [], showHidden: [],
  };
  storage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({ ...defaults, ...partial }));
}

const DAILY_SECTION  = SECTIONS.find(s => s.id === 'daily')!;
const WEEKLY_SECTION = SECTIONS.find(s => s.id === 'weekly')!;
const OTHER_SECTION  = SECTIONS.find(s => s.id === 'other')!;

// A leaf task in the daily section (not a parent).
const DAILY_LEAF = DAILY_SECTION.tasks.find(t => !t.isParent)!;
// The parent task in the daily section.
const DAILY_PARENT = DAILY_SECTION.tasks.find(t => t.isParent)!;
// First subtask of that parent.
const DAILY_SUBTASK = DAILY_PARENT.subtasks![0];

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('TaskChecklistService', () => {
  let fakeStorage: Storage;

  beforeEach(() => {
    fakeStorage = makeLocalStorageFake();
    vi.stubGlobal('localStorage', fakeStorage);

    // Pin a stable Monday so weekStartUTC() is deterministic across the tests
    // that don't care about reset boundaries. 2026-06-22 is a Monday.
    vi.setSystemTime(new Date('2026-06-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function build(): TaskChecklistService {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    return TestBed.inject(TaskChecklistService);
  }

  // ── sectionTotal ─────────────────────────────────────────────────────────

  it('sectionTotal counts leaf tasks and all subtasks, not parent rows themselves', () => {
    const service = build();
    const total = service.sectionTotal(DAILY_SECTION);
    const parents = DAILY_SECTION.tasks.filter(t => t.isParent && t.subtasks);
    const expectedFromParents = parents.reduce((n, t) => n + t.subtasks!.length, 0);
    const expectedFromLeaves  = DAILY_SECTION.tasks.filter(t => !t.isParent).length;
    expect(total).toBe(expectedFromLeaves + expectedFromParents);
  });

  it('sectionTotal excludes a hidden parent task and all its subtasks', () => {
    const subtaskCount = DAILY_PARENT.subtasks!.length;
    seedStorage(fakeStorage, { hidden: [DAILY_PARENT.id] });
    const service = build();
    const withHidden = service.sectionTotal(DAILY_SECTION);

    // Rebuild without hiding to get the baseline.
    TestBed.resetTestingModule();
    fakeStorage = makeLocalStorageFake();
    vi.stubGlobal('localStorage', fakeStorage);
    const service2 = build();
    const baseline = service2.sectionTotal(DAILY_SECTION);

    expect(withHidden).toBe(baseline - subtaskCount);
  });

  it('sectionTotal excludes individual hidden subtasks', () => {
    const service = build();
    const baseline = service.sectionTotal(DAILY_SECTION);

    TestBed.resetTestingModule();
    fakeStorage = makeLocalStorageFake();
    vi.stubGlobal('localStorage', fakeStorage);
    seedStorage(fakeStorage, { hidden: [DAILY_SUBTASK.id] });
    const service2 = build();
    expect(service2.sectionTotal(DAILY_SECTION)).toBe(baseline - 1);
  });

  // ── sectionCompleted ──────────────────────────────────────────────────────

  it('sectionCompleted returns 0 when nothing is checked', () => {
    const service = build();
    expect(service.sectionCompleted(DAILY_SECTION)).toBe(0);
  });

  it('sectionCompleted counts checked leaf tasks', () => {
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked: { [`daily:${DAILY_LEAF.id}`]: true } });
    const service = build();
    expect(service.sectionCompleted(DAILY_SECTION)).toBe(1);
  });

  it('sectionCompleted counts checked subtasks but skips hidden ones', () => {
    const sub0 = DAILY_PARENT.subtasks![0];
    const sub1 = DAILY_PARENT.subtasks![1];
    seedStorage(fakeStorage, {
      dailyDate: '2026-06-22', weeklyDate: '2026-06-22',
      checked: {
        [`daily:${sub0.id}`]: true,
        [`daily:${sub1.id}`]: true,
      },
      hidden: [sub1.id],   // sub1 is hidden, must not count
    });
    const service = build();
    expect(service.sectionCompleted(DAILY_SECTION)).toBe(1);
  });

  // ── pinnedEntries ─────────────────────────────────────────────────────────

  it('pinnedEntries omits completed leaf tasks', () => {
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked: { [`daily:${DAILY_LEAF.id}`]: true } });
    const service = build();
    const entries = service.pinnedEntries('daily');
    const ids = entries.filter(e => e.type === 'task').map(e => (e as { taskId: string }).taskId);
    expect(ids).not.toContain(DAILY_LEAF.id);
  });

  it('pinnedEntries omits a parent group when ALL its subtasks are complete', () => {
    const checked: Record<string, boolean> = {};
    DAILY_PARENT.subtasks!.forEach(s => { checked[`daily:${s.id}`] = true; });
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked });
    const service = build();
    const groupIds = service.pinnedEntries('daily')
      .filter(e => e.type === 'group')
      .map(e => (e as { groupId: string }).groupId);
    expect(groupIds).not.toContain(DAILY_PARENT.id);
  });

  it('pinnedEntries includes a parent group that has at least one incomplete subtask', () => {
    const checked: Record<string, boolean> = {};
    // Check all subtasks except the first.
    DAILY_PARENT.subtasks!.slice(1).forEach(s => { checked[`daily:${s.id}`] = true; });
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked });
    const service = build();
    const groupIds = service.pinnedEntries('daily')
      .filter(e => e.type === 'group')
      .map(e => (e as { groupId: string }).groupId);
    expect(groupIds).toContain(DAILY_PARENT.id);
  });

  it('pinnedEntries group lists only the incomplete subtasks', () => {
    const checked: Record<string, boolean> = {};
    // Mark all but the first subtask as done.
    DAILY_PARENT.subtasks!.slice(1).forEach(s => { checked[`daily:${s.id}`] = true; });
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked });
    const service = build();
    const group = service.pinnedEntries('daily').find(
      e => e.type === 'group' && (e as { groupId: string }).groupId === DAILY_PARENT.id
    ) as { subtasks: { taskId: string }[] } | undefined;
    expect(group).toBeDefined();
    expect(group!.subtasks).toHaveLength(1);
    expect(group!.subtasks[0].taskId).toBe(DAILY_PARENT.subtasks![0].id);
  });

  // ── incompleteTasks ───────────────────────────────────────────────────────

  it('incompleteTasks returns entries from every section', () => {
    const service = build();
    const sectionIds = [...new Set(service.incompleteTasks().map(t => t.sectionId))];
    expect(sectionIds).toContain('daily');
    expect(sectionIds).toContain('weekly');
    expect(sectionIds).toContain('other');
  });

  it('incompleteTasks excludes hidden tasks', () => {
    seedStorage(fakeStorage, { hidden: [DAILY_LEAF.id] });
    const service = build();
    expect(service.incompleteTasks().some(t => t.taskId === DAILY_LEAF.id)).toBe(false);
  });

  it('incompleteTasks excludes checked tasks', () => {
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked: { [`daily:${DAILY_LEAF.id}`]: true } });
    const service = build();
    expect(service.incompleteTasks().some(t => t.taskId === DAILY_LEAF.id)).toBe(false);
  });

  it('incompleteTasks expands parent tasks into subtasks, not the parent id itself', () => {
    const service = build();
    const result = service.incompleteTasks();
    expect(result.some(t => t.taskId === DAILY_PARENT.id)).toBe(false);
    expect(result.some(t => t.taskId === DAILY_SUBTASK.id)).toBe(true);
  });

  // ── applyAutoReset ────────────────────────────────────────────────────────

  it('applyAutoReset resets daily tasks when dailyDate is stale', () => {
    seedStorage(fakeStorage, {
      dailyDate: '2026-06-21',      // yesterday
      weeklyDate: '2026-06-22',     // current week start
      checked: { [`daily:${DAILY_LEAF.id}`]: true },
    });
    const service = build();
    expect(service.st().checked[`daily:${DAILY_LEAF.id}`]).toBeUndefined();
  });

  it('applyAutoReset does not reset daily tasks when dailyDate matches today', () => {
    seedStorage(fakeStorage, {
      dailyDate: '2026-06-22',
      weeklyDate: '2026-06-22',
      checked: { [`daily:${DAILY_LEAF.id}`]: true },
    });
    const service = build();
    expect(service.st().checked[`daily:${DAILY_LEAF.id}`]).toBe(true);
  });

  it('applyAutoReset resets weekly tasks when weeklyDate is stale', () => {
    const weeklyLeaf = WEEKLY_SECTION.tasks.find(t => !t.isParent)!;
    seedStorage(fakeStorage, {
      dailyDate: '2026-06-22',
      weeklyDate: '2026-06-15',     // previous week
      checked: { [`weekly:${weeklyLeaf.id}`]: true },
    });
    const service = build();
    expect(service.st().checked[`weekly:${weeklyLeaf.id}`]).toBeUndefined();
  });

  it('applyAutoReset does not reset weekly tasks when weeklyDate matches the current week', () => {
    const weeklyLeaf = WEEKLY_SECTION.tasks.find(t => !t.isParent)!;
    seedStorage(fakeStorage, {
      dailyDate: '2026-06-22',
      weeklyDate: '2026-06-22',
      checked: { [`weekly:${weeklyLeaf.id}`]: true },
    });
    const service = build();
    expect(service.st().checked[`weekly:${weeklyLeaf.id}`]).toBe(true);
  });

  it('applyAutoReset never resets "other" section tasks regardless of dates', () => {
    const otherLeaf = OTHER_SECTION.tasks[0];
    seedStorage(fakeStorage, {
      dailyDate: '',   // force daily reset
      weeklyDate: '', // force weekly reset
      checked: { [`other:${otherLeaf.id}`]: true },
    });
    const service = build();
    expect(service.st().checked[`other:${otherLeaf.id}`]).toBe(true);
  });

  // ── resetSection ──────────────────────────────────────────────────────────

  it('resetSection clears only leaf keys for the targeted section', () => {
    const weeklyLeaf = WEEKLY_SECTION.tasks.find(t => !t.isParent)!;
    seedStorage(fakeStorage, {
      dailyDate: '2026-06-22',
      weeklyDate: '2026-06-22',
      checked: {
        [`daily:${DAILY_LEAF.id}`]: true,
        [`weekly:${weeklyLeaf.id}`]: true,
      },
    });
    const service = build();
    service.resetSection(DAILY_SECTION);
    const { checked } = service.st();
    expect(checked[`daily:${DAILY_LEAF.id}`]).toBeUndefined();
    expect(checked[`weekly:${weeklyLeaf.id}`]).toBe(true);
  });

  it('resetSection also clears subtask keys belonging to parent groups', () => {
    const checked: Record<string, boolean> = {};
    DAILY_PARENT.subtasks!.forEach(s => { checked[`daily:${s.id}`] = true; });
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22', checked });
    const service = build();
    service.resetSection(DAILY_SECTION);
    DAILY_PARENT.subtasks!.forEach(s => {
      expect(service.st().checked[`daily:${s.id}`]).toBeUndefined();
    });
  });

  // ── localStorage roundtrip ────────────────────────────────────────────────

  it('persists a toggle to localStorage and recovers the state on next load', () => {
    seedStorage(fakeStorage, { dailyDate: '2026-06-22', weeklyDate: '2026-06-22' });
    const service = build();
    service.toggle('daily', DAILY_LEAF.id);

    // Simulate page reload: tear down TestBed and rebuild the service from the
    // same localStorage instance (fakeStorage is still in scope).
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const service2 = TestBed.inject(TaskChecklistService);
    expect(service2.isChecked('daily', DAILY_LEAF.id)).toBe(true);
  });
});
