import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  WorldStateService,
  currentIncarnonWeek,
  type WorldState,
} from './world-state.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal DayNightResponse that the service can parse. */
function makeDayNightResponse(serverTime: number) {
  return {
    time: serverTime,
    daynight: {
      time: serverTime,
      data: [
        // cetus: 100-second cycle, day from 0..60, night from 60..100
        { id: 'cetus',   start: 0, length: 100, dayStart: 0,  dayEnd: 60  },
        // fortuna: 50-second cycle, day from 10..40
        { id: 'fortuna', start: 0, length: 50,  dayStart: 10, dayEnd: 40  },
        // earth: 200-second cycle, day from 0..120
        { id: 'earth',   start: 0, length: 200, dayStart: 0,  dayEnd: 120 },
      ],
    },
  };
}

/** Resolve all pending microtasks (Promise chains inside the service). */
async function flushPromises(): Promise<void> {
  await new Promise<void>(resolve => setTimeout(resolve, 0));
}

// ---------------------------------------------------------------------------
// currentIncarnonWeek()
// ---------------------------------------------------------------------------

describe('currentIncarnonWeek()', () => {
  afterEach(() => vi.useRealTimers());

  it('returns 1 when cycleLength is 0 or negative', () => {
    expect(currentIncarnonWeek(0)).toBe(1);
    expect(currentIncarnonWeek(-1)).toBe(1);
  });

  it('returns week 9 at the reference anchor date 2026-06-22 with cycleLength 9', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-22T00:00:00.000Z'));
    // Source: INCARNON_REF_WEEK = 9, INCARNON_REF_WEEK_START_MS = 2026-06-22
    expect(currentIncarnonWeek(9)).toBe(9);
  });

  it('returns week 5 on the cross-check date 2026-05-31 with cycleLength 9', () => {
    vi.useFakeTimers();
    // Source comment: "cross-check: 2026-05-31 fell in Week 5"
    vi.setSystemTime(new Date('2026-05-31T00:00:00.000Z'));
    expect(currentIncarnonWeek(9)).toBe(5);
  });

  it('wraps back to the same week after adding cycleLength full weeks', () => {
    vi.useFakeTimers();
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const base = new Date('2026-05-31T00:00:00.000Z').getTime();
    vi.setSystemTime(base);
    const weekBefore = currentIncarnonWeek(9);
    vi.setSystemTime(base + 9 * WEEK_MS);
    expect(currentIncarnonWeek(9)).toBe(weekBefore);
  });

  it('always returns a value between 1 and cycleLength inclusive', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-03-14T12:34:56.000Z'));
    const week = currentIncarnonWeek(9);
    expect(week).toBeGreaterThanOrEqual(1);
    expect(week).toBeLessThanOrEqual(9);
  });
});

// ---------------------------------------------------------------------------
// WorldStateService — HTTP success / error / malformed
// ---------------------------------------------------------------------------

describe('WorldStateService', () => {
  let service: WorldStateService;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Intercept native fetch BEFORE the service is constructed; its constructor
    // calls load() → fetch() immediately.
    fetchSpy = vi.spyOn(globalThis, 'fetch');

    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // HTTP success
  // -------------------------------------------------------------------------

  it('populates the data signal with a parsed WorldState on a successful fetch', async () => {
    const serverTime = 30; // elapsed=30 inside cetus → day phase (dayStart=0, dayEnd=60)
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeDayNightResponse(serverTime)), { status: 200 }),
    );

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    const state = service.data();
    expect(state).not.toBeNull();

    const ws = state as WorldState;
    expect(ws.cetusCycle.id).toBe('cetus');
    expect(ws.cetusCycle.isDay).toBe(true);
    expect(ws.vallisCycle.id).toBe('fortuna');
    expect(ws.earthCycle.id).toBe('earth');
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
  });

  it('sets isDay=false when elapsed is past dayEnd (night phase)', async () => {
    // cetus: dayEnd=60, serverTime=70 → elapsed=70 → night
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeDayNightResponse(70)), { status: 200 }),
    );

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    const ws = service.data() as WorldState;
    expect(ws.cetusCycle.isDay).toBe(false);

    // The expiry timestamp must be strictly after the server time
    const expiryMs = new Date(ws.cetusCycle.expiry).getTime();
    expect(expiryMs).toBeGreaterThan(70 * 1000);
  });

  it('produces ISO-8601 activation and expiry strings', async () => {
    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(makeDayNightResponse(20)), { status: 200 }),
    );

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    const cycle = (service.data() as WorldState).cetusCycle;
    expect(cycle.activation).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(cycle.expiry).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  // -------------------------------------------------------------------------
  // HTTP error
  // -------------------------------------------------------------------------

  it('stores an Error and leaves data null when the server returns a 4xx status', async () => {
    fetchSpy.mockResolvedValue(
      new Response('Not Found', { status: 404, statusText: 'Not Found' }),
    );

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    expect(service.error()).toBeInstanceOf(Error);
    expect((service.error() as Error).message).toContain('404');
    expect(service.loading()).toBe(false);
    expect(service.data()).toBeNull();
  });

  it('stores the rejection reason and leaves data null on a network error', async () => {
    fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    expect(service.error()).toBeInstanceOf(TypeError);
    expect(service.loading()).toBe(false);
    expect(service.data()).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Malformed / missing data
  // -------------------------------------------------------------------------

  it('stores a "Missing cycle data" error when required cycle IDs are absent', async () => {
    const incomplete = {
      time: 10,
      daynight: {
        time: 10,
        data: [
          { id: 'cetus', start: 0, length: 100, dayStart: 0, dayEnd: 60  },
          { id: 'earth', start: 0, length: 200, dayStart: 0, dayEnd: 120 },
          // "fortuna" intentionally omitted
        ],
      },
    };

    fetchSpy.mockResolvedValue(
      new Response(JSON.stringify(incomplete), { status: 200 }),
    );

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    expect(service.error()).toBeInstanceOf(Error);
    expect((service.error() as Error).message).toContain('Missing cycle data');
    expect(service.data()).toBeNull();
    expect(service.loading()).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Manual retry via load()
  // -------------------------------------------------------------------------

  it('clears a previous error and repopulates data when load() is retried successfully', async () => {
    // First call → network failure
    fetchSpy.mockRejectedValueOnce(new TypeError('offline'));

    service = TestBed.inject(WorldStateService);
    await flushPromises();

    expect(service.error()).toBeInstanceOf(TypeError);
    expect(service.data()).toBeNull();

    // Second call → success
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(makeDayNightResponse(20)), { status: 200 }),
    );

    service.load();
    await flushPromises();

    expect(service.error()).toBeNull();
    expect(service.data()).not.toBeNull();
    expect(service.loading()).toBe(false);
  });
});
