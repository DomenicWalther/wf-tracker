import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PaletteService {
  readonly isOpen = signal(false);
  private readonly _pendingSearch = signal('');

  open(): void { this.isOpen.set(true); }
  close(): void { this.isOpen.set(false); }

  setPendingSearch(q: string): void { this._pendingSearch.set(q); }

  consumePendingSearch(): string {
    const q = this._pendingSearch();
    this._pendingSearch.set('');
    return q;
  }
}
