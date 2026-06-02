import { Component, ChangeDetectionStrategy, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrackerService } from '../../../core/services/tracker.service';
import { TaskChecklistService, SECTIONS, PinnedEntry, PinnedTaskGroup } from '../../../core/services/task-checklist.service';
import { WorldStatePanelComponent } from '../world-state-panel/world-state-panel.component';

type ChecklistTab = 'daily' | 'weekly' | 'other';

@Component({
  selector: 'app-pinned-bar',
  imports: [WorldStatePanelComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isVisible()) {
      <aside class="pinned-bar" aria-label="Pinned widgets">
        @if (hasWorldState()) {
          <section class="pin-widget pin-world-state" aria-label="World State">
            <div class="pin-widget-header">
              <span class="pin-widget-title">WORLD STATE</span>
            </div>
            <app-world-state-panel [hiddenCycles]="hiddenCycles()" [compact]="true" />
          </section>
        }

        @if (hasChecklist()) {
          <section class="pin-widget pin-checklist" aria-label="Task Checklist — incomplete tasks">
            <!-- Header row: title + tab pills + open link -->
            <div class="pin-widget-header">
              <span class="pin-widget-title">TASKS</span>
              <div class="pin-tabs" role="tablist" aria-label="Task sections">
                @for (tab of tabs; track tab.id) {
                  <button
                    class="pin-tab"
                    role="tab"
                    [class.active]="activeTab() === tab.id"
                    [attr.aria-selected]="activeTab() === tab.id"
                    (click)="activeTab.set(tab.id)"
                  >
                    {{ tab.label }}
                    @if (tabCount(tab.id) > 0) {
                      <span class="pin-tab-count">{{ tabCount(tab.id) }}</span>
                    }
                  </button>
                }
              </div>
              <a class="pin-link" routerLink="/task-checklist" aria-label="Open full task checklist">↗</a>
            </div>

            <!-- Task list for active tab -->
            <ul class="pin-task-list" role="tabpanel" [attr.aria-label]="activeTab() + ' tasks'">
              @for (entry of activeTabEntries(); track entryKey(entry)) {
                @if (entry.type === 'task') {
                  <li class="pin-task-item" [class.pin-task-done]="svc.isChecked(entry.sectionId, entry.taskId)">
                    <label class="pin-task-label">
                      <input type="checkbox" class="pin-checkbox"
                        [checked]="svc.isChecked(entry.sectionId, entry.taskId)"
                        (change)="svc.toggle(entry.sectionId, entry.taskId)"
                        [attr.aria-label]="entry.label" />
                      <span class="pin-task-name">{{ entry.label }}</span>
                    </label>
                  </li>
                } @else {
                  <li class="pin-group">
                    <button class="pin-group-header"
                      (click)="toggleGroup(entry.groupId)"
                      [attr.aria-expanded]="!isGroupCollapsed(entry.groupId)">
                      <span class="pin-group-arrow" aria-hidden="true">{{ isGroupCollapsed(entry.groupId) ? '▶' : '▼' }}</span>
                      <span class="pin-group-label">{{ entry.label }}</span>
                      <span class="pin-group-count">{{ entry.completedCount }}/{{ entry.totalVisible }}</span>
                    </button>
                    @if (!isGroupCollapsed(entry.groupId)) {
                      <ul class="pin-subtask-list" role="list">
                        @for (sub of entry.subtasks; track sub.taskId) {
                          <li class="pin-task-item pin-subtask" [class.pin-task-done]="svc.isChecked(entry.sectionId, sub.taskId)">
                            <label class="pin-task-label">
                              <input type="checkbox" class="pin-checkbox"
                                [checked]="svc.isChecked(entry.sectionId, sub.taskId)"
                                (change)="svc.toggle(entry.sectionId, sub.taskId)"
                                [attr.aria-label]="sub.label" />
                              <span class="pin-task-name">{{ sub.label }}</span>
                            </label>
                          </li>
                        }
                      </ul>
                    }
                  </li>
                }
              }
              @if (activeTabEntries().length === 0) {
                <li class="pin-all-done" role="status">All {{ activeTab() }} tasks done!</li>
              }
            </ul>
          </section>
        }
      </aside>
    }
  `,
  styles: [`
    .pinned-bar {
      position: fixed;
      bottom: 0;
      left: 216px;
      right: 0;
      z-index: 100;
      display: flex;
      background: var(--color-bg);
      border-top: 1px solid var(--color-border);
      height: 200px;
    }

    .pin-widget {
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--color-border);
      min-width: 0;
      overflow: hidden;
    }

    .pin-world-state {
      flex: 3;
      min-width: 300px;
    }

    .pin-checklist {
      flex: 1;
      min-width: 280px;
      max-width: 420px;
    }

    /* ── Header ── */
    .pin-widget-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px 0 14px;
      height: 32px;
      background: var(--color-surface2);
      border-bottom: 1px solid var(--color-border);
      flex-shrink: 0;
    }

    .pin-widget-title {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .pin-link {
      margin-left: auto;
      color: var(--color-text-muted);
      text-decoration: none;
      font-size: 13px;
      line-height: 1;
      padding: 3px 5px;
      border-radius: 3px;
      flex-shrink: 0;
      transition: color 0.15s;
    }
    .pin-link:hover { color: var(--color-gold); }
    .pin-link:focus-visible { outline: 2px solid var(--color-accent-light); outline-offset: 2px; }

    /* ── Tabs ── */
    .pin-tabs {
      display: flex;
      gap: 2px;
      align-items: center;
    }

    .pin-tab {
      display: flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: 1px solid transparent;
      border-radius: 4px;
      color: var(--color-text-muted);
      font-size: 10px;
      font-weight: 600;
      padding: 2px 7px;
      cursor: pointer;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      transition: color 0.12s, border-color 0.12s, background 0.12s;
      white-space: nowrap;
    }
    .pin-tab:hover { color: var(--color-text); border-color: var(--color-border); }
    .pin-tab.active {
      color: var(--color-gold);
      border-color: var(--color-gold);
      background: color-mix(in srgb, var(--color-gold) 8%, transparent);
    }
    .pin-tab:focus-visible { outline: 2px solid var(--color-accent-light); outline-offset: 2px; }

    .pin-tab-count {
      font-size: 9px;
      font-weight: 700;
      background: color-mix(in srgb, var(--color-gold) 20%, transparent);
      color: var(--color-gold);
      border-radius: 8px;
      padding: 0 4px;
      line-height: 14px;
    }
    .pin-tab:not(.active) .pin-tab-count {
      background: var(--color-surface3, var(--color-border));
      color: var(--color-text-muted);
    }

    /* ── Task list ── */
    .pin-task-list {
      list-style: none;
      margin: 0;
      padding: 4px 0;
      overflow-y: auto;
      flex: 1;
    }

    .pin-task-item {
      display: flex;
      align-items: center;
    }
    .pin-task-item.pin-task-done { opacity: 0.35; }

    .pin-task-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 14px;
      cursor: pointer;
      flex: 1;
      min-width: 0;
    }

    .pin-task-name {
      font-size: 12px;
      color: var(--color-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pin-task-item.pin-task-done .pin-task-name {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .pin-checkbox {
      flex-shrink: 0;
      accent-color: var(--color-gold);
      width: 12px;
      height: 12px;
      cursor: pointer;
    }

    .pin-all-done {
      padding: 16px 14px;
      font-size: 12px;
      color: var(--color-text-muted);
      font-style: italic;
    }

    /* ── Groups ── */
    .pin-group { border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent); }
    .pin-group:last-child { border-bottom: none; }

    .pin-group-header {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      background: color-mix(in srgb, var(--color-surface2) 60%, transparent);
      border: none;
      padding: 4px 14px;
      cursor: pointer;
      text-align: left;
    }
    .pin-group-header:hover { background: var(--color-surface2); }
    .pin-group-header:focus-visible { outline: 2px solid var(--color-accent-light); outline-offset: -2px; }

    .pin-group-arrow {
      font-size: 8px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .pin-group-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-gold);
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pin-group-count {
      font-size: 10px;
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .pin-subtask-list { list-style: none; margin: 0; padding: 0; }
    .pin-subtask .pin-task-label { padding-left: 28px; }
  `]
})
export class PinnedBarComponent {
  private readonly tracker = inject(TrackerService);
  readonly svc = inject(TaskChecklistService);

  private readonly pinnedBar = computed(() => this.tracker.settings().pinnedBar);

  readonly isVisible = computed(() => this.pinnedBar().widgets.length > 0);
  readonly hasWorldState = computed(() => this.pinnedBar().widgets.includes('world-state'));
  readonly hasChecklist = computed(() => this.pinnedBar().widgets.includes('task-checklist'));
  readonly hiddenCycles = computed(() => this.pinnedBar().hiddenCycles);

  readonly activeTab = signal<ChecklistTab>('daily');
  private readonly collapsedGroups = signal<string[]>([]);

  readonly tabs: { id: ChecklistTab; label: string }[] = [
    { id: 'daily',   label: 'Daily'   },
    { id: 'weekly',  label: 'Weekly'  },
    { id: 'other',   label: 'Other'   },
  ];

  private readonly allEntries = computed(() => {
    this.svc.st(); // track signal
    return {
      daily:  this.svc.pinnedEntries('daily'),
      weekly: this.svc.pinnedEntries('weekly'),
      other:  this.svc.pinnedEntries('other'),
    };
  });

  readonly activeTabEntries = computed(() => this.allEntries()[this.activeTab()]);

  tabCount(tab: ChecklistTab): number {
    const entries = this.allEntries()[tab];
    return entries.reduce((n, e) =>
      e.type === 'task' ? n + 1 : n + e.subtasks.length, 0
    );
  }

  entryKey(entry: PinnedEntry): string {
    return entry.type === 'task' ? entry.taskId : entry.groupId;
  }

  isGroupCollapsed(groupId: string): boolean {
    return this.collapsedGroups().includes(groupId);
  }

  toggleGroup(groupId: string): void {
    this.collapsedGroups.update(ids =>
      ids.includes(groupId) ? ids.filter(id => id !== groupId) : [...ids, groupId]
    );
  }
}
