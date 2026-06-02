import { Component, computed, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';
import { TaskChecklistService, SECTIONS, TaskSection, Task } from '../../core/services/task-checklist.service';

@Component({
  selector: 'app-task-checklist',
  imports: [SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="TASK CHECKLIST"
        description="Track your daily, weekly, and periodic Warframe tasks. Daily tasks reset at 00:00 UTC; weekly tasks reset every Monday at 00:00 UTC."
        [completed]="totalCompleted()"
        [total]="totalVisible()"
      />

      <p class="hint">
        Remember: you don't have to do everything — prioritize tasks based on your current goals.
        <span class="hint-dim">Tasks you don't want to see can be hidden individually.</span>
      </p>

      <section class="notes-section" aria-label="Quick notes">
        <div class="notes-header">
          <h2 class="notes-title">QUICK NOTES</h2>
          <span class="notes-hint">Jot down what you want to do next session</span>
        </div>
        <textarea
          class="notes-textarea"
          [value]="notes()"
          (input)="onNotesInput($event)"
          placeholder="e.g. Farm Lua Disruption for Axi relics, try Archon Hunt..."
          aria-label="Quick notes"
          rows="4"
        ></textarea>
      </section>

      @for (section of sections; track section.id) {
        <section class="task-section" [attr.aria-labelledby]="section.id + '-heading'">

          <!-- ── Section header ── -->
          <div class="section-header">
            <div class="section-title-row">
              <h2 class="section-title" [id]="section.id + '-heading'">{{ section.title }}</h2>
              <span class="reset-badge" [class]="'reset-badge ' + section.resetType">
                @if (section.resetType === 'daily')  { Resets in {{ svc.dailyReset() }} }
                @if (section.resetType === 'weekly') { Resets in {{ svc.weeklyReset() }} }
                @if (section.resetType === 'other')  { Manual }
              </span>
            </div>
            <div class="section-meta">
              <span class="section-count">{{ svc.sectionCompleted(section) }}/{{ svc.sectionTotal(section) }} completed</span>
              <button class="reset-btn" type="button" (click)="svc.resetSection(section)" [attr.aria-label]="'Reset ' + section.title">
                Reset
              </button>
            </div>
            <div class="progress-bar-bg" role="progressbar"
                 [attr.aria-valuenow]="svc.sectionCompleted(section)"
                 [attr.aria-valuemax]="svc.sectionTotal(section)"
                 [attr.aria-label]="section.title + ' progress'">
              <div class="progress-bar-fill" [style.width.%]="svc.sectionPct(section)"></div>
            </div>
          </div>

          <!-- ── Task list ── -->
          <ul class="task-list" role="list">
            @for (task of svc.visibleTopLevel(section); track task.id) {
              @if (task.isParent) {
                <!-- Parent / group row -->
                <li class="group-item">
                  <div class="group-header">
                    <button
                      class="collapse-toggle"
                      type="button"
                      [attr.aria-expanded]="!svc.isCollapsed(task.id)"
                      [attr.aria-label]="(svc.isCollapsed(task.id) ? 'Expand ' : 'Collapse ') + task.label"
                      (click)="svc.toggleCollapse(task.id)"
                    >
                      <span aria-hidden="true">{{ svc.isCollapsed(task.id) ? '▶' : '▼' }}</span>
                    </button>
                    <span class="group-label">{{ task.label }}</span>
                    <span class="group-sub-count" aria-hidden="true">
                      {{ svc.subtaskCompleted(section, task) }}/{{ svc.subtaskVisible(section, task) }}
                    </span>
                    <button
                      class="hide-btn"
                      type="button"
                      (click)="svc.hideTask(task.id)"
                      title="Hide this group"
                      aria-label="Hide group {{ task.label }}"
                    >Hide</button>
                  </div>

                  @if (!svc.isCollapsed(task.id) && task.subtasks) {
                    <ul class="subtask-list" role="list">
                      @for (sub of svc.visibleSubtasks(section, task); track sub.id) {
                        <li class="task-item subtask" [class.task-done]="svc.isChecked(section.id, sub.id)">
                          <label class="task-label">
                            <input
                              type="checkbox"
                              class="task-checkbox"
                              [checked]="svc.isChecked(section.id, sub.id)"
                              (change)="svc.toggle(section.id, sub.id)"
                              [attr.aria-label]="sub.label"
                            />
                            <span class="task-name">{{ sub.label }}</span>
                            @if (sub.location) {
                              <span class="task-meta">📍 {{ sub.location }}</span>
                            }
                            @if (sub.prereq) {
                              <span class="task-prereq">Req: {{ sub.prereq }}</span>
                            }
                          </label>
                          <button
                            class="hide-btn"
                            type="button"
                            (click)="svc.hideTask(sub.id)"
                            title="Hide this task"
                            [attr.aria-label]="'Hide task: ' + sub.label"
                          >Hide</button>
                        </li>
                      }
                    </ul>
                  }
                </li>
              } @else {
                <!-- Regular task row -->
                <li class="task-item" [class.task-done]="svc.isChecked(section.id, task.id)">
                  <label class="task-label">
                    <input
                      type="checkbox"
                      class="task-checkbox"
                      [checked]="svc.isChecked(section.id, task.id)"
                      (change)="svc.toggle(section.id, task.id)"
                      [attr.aria-label]="task.label"
                    />
                    <span class="task-name">{{ task.label }}</span>
                    @if (task.description) {
                      <span class="task-desc">{{ task.description }}</span>
                    }
                    @if (task.location) {
                      <span class="task-meta">📍 {{ task.location }}</span>
                    }
                    @if (task.prereq) {
                      <span class="task-prereq">Req: {{ task.prereq }}</span>
                    }
                  </label>
                  <button
                    class="hide-btn"
                    type="button"
                    (click)="svc.hideTask(task.id)"
                    title="Hide this task"
                    [attr.aria-label]="'Hide task: ' + task.label"
                  >Hide</button>
                </li>
              }
            }
          </ul>

          <!-- ── Hidden tasks panel ── -->
          @if (svc.hiddenInSection(section).length > 0) {
            <div class="hidden-panel">
              <button
                class="hidden-toggle"
                type="button"
                [attr.aria-expanded]="svc.isShowingHidden(section.id)"
                (click)="svc.toggleShowHidden(section.id)"
              >
                <span aria-hidden="true">{{ svc.isShowingHidden(section.id) ? '▾' : '▸' }}</span>
                {{ svc.hiddenInSection(section).length }} hidden task{{ svc.hiddenInSection(section).length === 1 ? '' : 's' }}
              </button>

              @if (svc.isShowingHidden(section.id)) {
                <ul class="hidden-list" role="list">
                  @for (item of svc.hiddenInSection(section); track item.id) {
                    <li class="hidden-item">
                      <span class="hidden-item-label">{{ item.label }}</span>
                      <button
                        class="restore-btn"
                        type="button"
                        (click)="svc.restoreTask(item.id)"
                        [attr.aria-label]="'Restore task: ' + item.label"
                      >Restore</button>
                    </li>
                  }
                </ul>
              }
            </div>
          }

        </section>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 860px; }

    .hint {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: -8px 0 20px;
      font-style: italic;
    }
    .hint-dim { opacity: 0.65; margin-left: 6px; }

    /* ── Quick Notes ── */
    .notes-section {
      margin-bottom: 28px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .notes-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      padding: 10px 16px;
      background: var(--color-surface2);
      border-bottom: 1px solid var(--color-border);
    }
    .notes-title {
      margin: 0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-gold);
    }
    .notes-hint {
      font-size: 11px;
      color: var(--color-text-muted);
      font-style: italic;
    }
    .notes-textarea {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: transparent;
      border: none;
      color: var(--color-text);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      padding: 12px 16px;
      resize: vertical;
      outline: none;
    }
    .notes-textarea::placeholder { color: var(--color-text-muted); opacity: 0.5; }
    .notes-textarea:focus { background: color-mix(in srgb, var(--color-surface2) 50%, transparent); }

    /* ── Section ── */
    .task-section {
      margin-bottom: 28px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }

    .section-header {
      padding: 12px 16px;
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
    .reset-badge {
      font-size: 10px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 10px;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .reset-badge.daily  { border-color: #3a6a8a; color: #7fb8d8; }
    .reset-badge.weekly { border-color: #6a4a90; color: #b89ad8; }

    .section-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .section-count { font-size: 11px; color: var(--color-text-muted); }

    .reset-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .reset-btn:hover { border-color: var(--color-gold); color: var(--color-gold); }

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

    /* ── Task list ── */
    .task-list { list-style: none; margin: 0; padding: 0; }

    /* ── Regular task row ── */
    .task-item {
      display: flex;
      align-items: center;
      border-bottom: 1px solid var(--color-border);
      transition: background 0.1s;
    }
    .task-item:last-child { border-bottom: none; }
    .task-item:hover { background: var(--color-surface2); }
    .task-item.task-done { opacity: 0.5; }

    .task-label {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 6px 10px;
      padding: 9px 14px;
      cursor: pointer;
      flex: 1;
    }

    .task-checkbox {
      flex-shrink: 0;
      accent-color: var(--color-gold);
      width: 14px;
      height: 14px;
      cursor: pointer;
      align-self: center;
    }

    .task-name {
      font-size: 13px;
      color: var(--color-text);
      font-weight: 500;
    }
    .task-done .task-name { text-decoration: line-through; color: var(--color-text-muted); }

    .task-desc {
      font-size: 11px;
      color: var(--color-text-muted);
    }

    .task-meta {
      font-size: 10px;
      color: var(--color-text-muted);
      opacity: 0.75;
    }

    .task-prereq {
      font-size: 10px;
      color: #8a6a30;
      background: #1e1a10;
      border: 1px solid #3a3010;
      padding: 1px 6px;
      border-radius: 3px;
    }

    /* ── Hide button ── */
    .hide-btn {
      flex-shrink: 0;
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 10px;
      padding: 4px 10px;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.15s, color 0.15s;
      white-space: nowrap;
    }
    .task-item:hover .hide-btn,
    .group-header:hover .hide-btn { opacity: 1; }
    .hide-btn:hover { color: #c06060; opacity: 1; }

    /* ── Parent / group row ── */
    .group-item { border-bottom: 1px solid var(--color-border); }
    .group-item:last-child { border-bottom: none; }

    .group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      background: color-mix(in srgb, var(--color-surface2) 60%, transparent);
    }
    .group-header:hover { background: var(--color-surface2); }

    .collapse-toggle {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 10px;
      cursor: pointer;
      padding: 2px 4px;
      line-height: 1;
    }
    .collapse-toggle:hover { color: var(--color-gold); }

    .group-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--color-gold-light, var(--color-gold));
      flex: 1;
    }

    .group-sub-count {
      font-size: 10px;
      color: var(--color-text-muted);
      margin-right: 4px;
    }

    /* ── Subtask rows ── */
    .subtask-list { list-style: none; margin: 0; padding: 0; }
    .subtask { padding-left: 16px; }
    .subtask .task-label { padding-left: 28px; }

    /* ── Hidden tasks panel ── */
    .hidden-panel {
      border-top: 1px dashed var(--color-border);
      padding: 8px 16px;
      background: color-mix(in srgb, var(--color-surface2) 40%, transparent);
    }

    .hidden-toggle {
      background: none;
      border: none;
      color: var(--color-text-muted);
      font-size: 11px;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .hidden-toggle:hover { color: var(--color-text); }

    .hidden-list {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .hidden-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .hidden-item-label { flex: 1; }

    .restore-btn {
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 10px;
      padding: 1px 8px;
      border-radius: 3px;
      cursor: pointer;
    }
    .restore-btn:hover { border-color: var(--color-gold); color: var(--color-gold); }
  `]
})
export class TaskChecklistComponent {
  readonly svc = inject(TaskChecklistService);
  readonly sections = SECTIONS;

  readonly totalVisible = computed(() =>
    SECTIONS.reduce((sum, sec) => sum + this.svc.sectionTotal(sec), 0)
  );
  readonly totalCompleted = computed(() =>
    SECTIONS.reduce((sum, sec) => sum + this.svc.sectionCompleted(sec), 0)
  );

  private readonly NOTES_KEY = 'wft_quick_notes';
  readonly notes = signal<string>(localStorage.getItem(this.NOTES_KEY) ?? '');

  onNotesInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement).value;
    this.notes.set(value);
    localStorage.setItem(this.NOTES_KEY, value);
  }
}
