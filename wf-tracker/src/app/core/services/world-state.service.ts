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
  cambionCycle: CycleState;
  earthCycle: CycleState;
}

const BASE = 'https://api.warframestat.us/pc';

/** Epoch: first Monday of the known Week 1 incarnon cycle (verified 2026-05-31 = Week 5). */
const INCARNON_EPOCH_MS = new Date('2022-10-17T00:00:00.000Z').getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const INCARNON_CYCLE = 8;

export function currentIncarnonWeek(): number {
  const weeksElapsed = Math.floor((Date.now() - INCARNON_EPOCH_MS) / WEEK_MS);
  return (weeksElapsed % INCARNON_CYCLE) + 1;
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
    const fetchCycle = (path: string): Promise<CycleState> =>
      fetch(`${BASE}/${path}`).then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${path}`);
        return r.json() as Promise<CycleState>;
      });

    Promise.all([
      fetchCycle('cetusCycle'),
      fetchCycle('vallisCycle'),
      fetchCycle('cambionCycle'),
      fetchCycle('earthCycle'),
    ]).then(([cetusCycle, vallisCycle, cambionCycle, earthCycle]) => {
      this._data.set({ cetusCycle, vallisCycle, cambionCycle, earthCycle });
      this._loading.set(false);
    }).catch(err => {
      this._error.set(err);
      this._loading.set(false);
    });
  }
}
