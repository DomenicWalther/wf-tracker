import { Injectable, signal, computed } from '@angular/core';

export interface CycleState {
  id: string;
  expiry: string;
  activation: string;
  isDay?: boolean;
  state: string;
  timeLeft: string;
}

export interface WorldState {
  cetusCycle: CycleState;
  vallisCycle: CycleState;
  cambionCycle?: CycleState;
  earthCycle: CycleState;
}

interface RawCycle {
  id: string;
  start: number;    // unix seconds
  length: number;   // seconds
  dayStart: number; // offset into cycle where day begins
  dayEnd: number;   // offset into cycle where day ends
}

interface DayNightResponse {
  time: number;
  daynight: { time: number; data: RawCycle[] };
}

const BASE = 'https://api.tenno.tools/worldstate';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Incarnon Genesis rotation (Steel Path Circuit). The available weapons rotate
 * weekly, resetting Monday 00:00 UTC, cycling through `cycleLength` weeks.
 *
 * The pool grows as DE adds weapons, so the caller passes the current length
 * (number of numbered weeks in the data) instead of a hardcoded constant —
 * adding a week to the data is then enough, no code change required.
 *
 * Anchored to a verified reference: the week beginning Monday 2026-06-22 UTC is
 * Week 9 (cross-check: 2026-05-31 fell in Week 5). New weeks are appended to the
 * end of the rotation, so this past anchor stays valid as the cycle grows.
 */
const INCARNON_REF_WEEK_START_MS = new Date('2026-06-22T00:00:00.000Z').getTime();
const INCARNON_REF_WEEK = 9;

export function currentIncarnonWeek(cycleLength: number): number {
  if (cycleLength <= 0) return 1;
  const weeksSinceRef = Math.floor((Date.now() - INCARNON_REF_WEEK_START_MS) / WEEK_MS);
  const raw = INCARNON_REF_WEEK - 1 + weeksSinceRef;
  // Positive modulo so dates before the reference week still map correctly.
  const idx = ((raw % cycleLength) + cycleLength) % cycleLength;
  return idx + 1;
}

function computeCycleState(raw: RawCycle, serverTime: number): CycleState {
  const elapsed = ((serverTime - raw.start) % raw.length + raw.length) % raw.length;
  const isDay = elapsed >= raw.dayStart && elapsed < raw.dayEnd;

  let phaseStartSec: number;
  let phaseEndSec: number;

  if (isDay) {
    phaseStartSec = serverTime - (elapsed - raw.dayStart);
    phaseEndSec   = serverTime + (raw.dayEnd - elapsed);
  } else if (elapsed >= raw.dayEnd) {
    // night, past dayEnd — wrapping toward next dayStart
    phaseStartSec = serverTime - (elapsed - raw.dayEnd);
    phaseEndSec   = serverTime + (raw.length - elapsed + raw.dayStart);
  } else {
    // night, before dayStart (wrapped around from previous night)
    phaseStartSec = serverTime - (elapsed + raw.length - raw.dayEnd);
    phaseEndSec   = serverTime + (raw.dayStart - elapsed);
  }

  return {
    id: raw.id,
    activation: new Date(phaseStartSec * 1000).toISOString(),
    expiry:     new Date(phaseEndSec   * 1000).toISOString(),
    isDay,
    state: String(isDay),
    timeLeft: '',
  };
}

@Injectable({ providedIn: 'root' })
export class WorldStateService {
  private readonly _data = signal<WorldState | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<unknown>(null);

  readonly data = computed(() => this._data());
  readonly loading = computed(() => this._loading());
  readonly error = computed(() => this._error());

  constructor() {
    this.load();
  }

  load(): void {
    this._loading.set(true);
    this._error.set(null);

    fetch(`${BASE}/pc/daynight`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<DayNightResponse>;
      })
      .then(({ time, daynight }) => {
        const byId = new Map(daynight.data.map(c => [c.id, c]));
        const cetus   = byId.get('cetus');
        const fortuna = byId.get('fortuna');
        const earth   = byId.get('earth');

        if (!cetus || !fortuna || !earth) throw new Error('Missing cycle data');

        this._data.set({
          cetusCycle:  computeCycleState(cetus,   time),
          vallisCycle: computeCycleState(fortuna, time),
          earthCycle:  computeCycleState(earth,   time),
        });
        this._loading.set(false);
      })
      .catch(err => {
        this._error.set(err);
        this._loading.set(false);
      });
  }
}
