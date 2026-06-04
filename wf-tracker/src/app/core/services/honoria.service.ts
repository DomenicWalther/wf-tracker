import { Injectable, signal, computed } from '@angular/core';
import { SECTIONS, TOTAL_HONORIA_ITEMS } from '../config/honoria-data';

const STORAGE_KEY = 'wft_honoria';

@Injectable({ providedIn: 'root' })
export class HonoriaService {
  readonly total = TOTAL_HONORIA_ITEMS;

  private readonly checked = signal<Set<string>>(this.load());

  readonly completed = computed(() => this.checked().size);

  isChecked(id: string): boolean {
    return this.checked().has(id);
  }

  toggle(id: string): void {
    this.checked.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      this.save(next);
      return next;
    });
  }

  checkAll(ids: string[]): void {
    this.checked.update(set => {
      const next = new Set(set);
      for (const id of ids) next.add(id);
      this.save(next);
      return next;
    });
  }

  sectionCompleted(ids: string[]): number {
    const set = this.checked();
    return ids.filter(id => set.has(id)).length;
  }

  private save(set: Set<string>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  }

  private load(): Set<string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  }
}

export { SECTIONS };
