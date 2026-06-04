import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { HonoriaService } from '../../core/services/honoria.service';
import { SECTIONS, HonoriaSection } from '../../core/config/honoria-data';

@Component({
  selector: 'app-honoria',
  imports: [SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="HONORIA"
        description="Track every Honoria title available in Warframe. Check off the ones you've earned."
        [completed]="svc.completed()"
        [total]="svc.total"
      />

      @for (section of sections; track section.id) {
        <section class="hon-section" [attr.aria-labelledby]="section.id + '-heading'">

          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title" [id]="section.id + '-heading'">{{ section.title }}</h2>
              <div class="section-actions">
                <span class="section-count">{{ svc.sectionCompleted(section.items.map(i => i.id)) }}/{{ section.items.length }}</span>
                <button
                  class="check-all-btn"
                  type="button"
                  (click)="svc.checkAll(section.items.map(i => i.id))"
                  [attr.aria-label]="'Check all in ' + section.title"
                >Check All</button>
              </div>
            </div>
            <div class="progress-bar-bg" role="progressbar"
                 [attr.aria-valuenow]="svc.sectionCompleted(section.items.map(i => i.id))"
                 [attr.aria-valuemax]="section.items.length"
                 [attr.aria-label]="section.title + ' progress'">
              <div class="progress-bar-fill" [style.width.%]="sectionPct(section)"></div>
            </div>
          </div>

          <ul class="item-list" role="list">
            @for (item of section.items; track item.id) {
              <li class="item-row" [class.item-done]="svc.isChecked(item.id)">
                <label class="item-label">
                  <input
                    type="checkbox"
                    class="item-checkbox"
                    [checked]="svc.isChecked(item.id)"
                    (change)="svc.toggle(item.id)"
                    [attr.aria-label]="item.name"
                  />
                  <span class="item-name">{{ item.name }}</span>
                  <span class="item-location">{{ item.location }}</span>
                </label>
              </li>
            }
          </ul>

        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 860px; }

    .hon-section {
      margin-bottom: 24px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .section-header {
      padding: 10px 16px;
      background: var(--color-surface2);
      border-bottom: 1px solid var(--color-border);
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 6px;
    }

    .section-title {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-gold);
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    .section-count {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .check-all-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .check-all-btn:hover { border-color: var(--color-gold); color: var(--color-gold); }

    .progress-bar-bg {
      height: 3px;
      background: var(--color-border);
      border-radius: 2px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: var(--color-gold);
      border-radius: 2px;
      transition: width 0.3s ease;
    }

    .item-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .item-row {
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      transition: background 0.1s;
    }

    .item-row:last-child { border-bottom: none; }
    .item-row:hover { background: var(--color-surface2); }
    .item-row.item-done { opacity: 0.45; }

    .item-label {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 10px;
      padding: 9px 14px;
      cursor: pointer;
      flex: 1;
    }

    .item-checkbox {
      flex-shrink: 0;
      accent-color: var(--color-gold);
      width: 14px;
      height: 14px;
      cursor: pointer;
      align-self: center;
    }

    .item-name {
      font-size: 13px;
      color: var(--color-text);
      font-weight: 500;
    }

    .item-done .item-name {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .item-location {
      font-size: 11px;
      color: var(--color-text-muted);
      opacity: 0.8;
    }
  `],
})
export class HonoriaComponent {
  readonly svc = inject(HonoriaService);
  readonly sections = SECTIONS;

  sectionPct(section: HonoriaSection): number {
    return section.items.length > 0
      ? (this.svc.sectionCompleted(section.items.map(i => i.id)) / section.items.length) * 100
      : 0;
  }
}
