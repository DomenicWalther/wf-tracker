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
    Promise.all([
      fetch(`${BASE}/cetusCycle`).then(r => r.json() as Promise<CycleState>),
      fetch(`${BASE}/vallisCycle`).then(r => r.json() as Promise<CycleState>),
      fetch(`${BASE}/cambionCycle`).then(r => r.json() as Promise<CycleState>),
      fetch(`${BASE}/earthCycle`).then(r => r.json() as Promise<CycleState>),
    ]).then(([cetusCycle, vallisCycle, cambionCycle, earthCycle]) => {
      this._data.set({ cetusCycle, vallisCycle, cambionCycle, earthCycle });
      this._loading.set(false);
    }).catch(err => {
      this._error.set(err);
      this._loading.set(false);
    });
  }
}
