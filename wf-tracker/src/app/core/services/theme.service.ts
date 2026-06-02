import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'wf-theme';
const NEUTRAL_DARK = 'neutral-dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isNeutralDark = signal(localStorage.getItem(STORAGE_KEY) === NEUTRAL_DARK);

  constructor() {
    this.applyTheme(this.isNeutralDark());
  }

  toggle(): void {
    const next = !this.isNeutralDark();
    this.isNeutralDark.set(next);
    this.applyTheme(next);
  }

  private applyTheme(neutral: boolean): void {
    if (neutral) {
      document.documentElement.setAttribute('data-theme', NEUTRAL_DARK);
      localStorage.setItem(STORAGE_KEY, NEUTRAL_DARK);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
