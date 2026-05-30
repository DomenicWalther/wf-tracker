import { Component, inject, computed, effect, ChangeDetectionStrategy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { DataService } from '../../core/services/data.service';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-big-goals',
  imports: [ReactiveFormsModule, SectionHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-section-header
        title="BIG GOALS"
        description="Your personal extreme completionist goals. Add, check off, and remove as you conquer them."
      />

      <div class="add-goal-row">
        <input
          class="goal-input"
          type="text"
          placeholder="Add a new big goal..."
          aria-label="New big goal"
          [formControl]="newGoalControl"
          (keyup.enter)="addGoal()"
        />
        <button type="button" class="add-btn" (click)="addGoal()" [disabled]="!newGoalControl.value.trim()">+ Add</button>
      </div>

      <div class="big-goals-list">
        @for (goal of goals(); track goal) {
          <div class="big-goal-item" [class.done]="isChecked(goal)">
            <label class="goal-label">
              <input type="checkbox" class="wf-checkbox" [checked]="isChecked(goal)" (change)="toggle(goal)" />
              <span class="big-goal-text">{{ goal }}</span>
            </label>
            <button class="delete-btn" type="button" (click)="deleteGoal(goal)" title="Remove goal" aria-label="Delete goal">✕</button>
          </div>
        }
        @if (goals().length === 0) {
          <div class="empty-state">No big goals yet. Add one above!</div>
        }
      </div>
    </div>
  `,
  styles: [`
    .page { max-width: 800px; }
    .add-goal-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    .goal-input {
      flex: 1;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
      outline: none;
    }
    .goal-input:focus { border-color: var(--color-gold); }
    .add-btn {
      background: var(--color-surface2);
      border: 1px solid var(--color-gold);
      color: var(--color-gold);
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      white-space: nowrap;
    }
    .add-btn:hover:not([disabled]) { background: var(--color-gold); color: #000; }
    .add-btn[disabled] { opacity: 0.4; cursor: default; border-color: var(--color-border); color: var(--color-text-muted); }
    .big-goals-list { display: flex; flex-direction: column; gap: 8px; }
    .big-goal-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 20px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      transition: all 0.2s;
    }
    .big-goal-item:hover { border-color: var(--color-gold); background: var(--color-surface2); }
    .big-goal-item.done { opacity: 0.6; }
    .goal-label {
      display: flex;
      align-items: center;
      gap: 14px;
      flex: 1;
      cursor: pointer;
    }
    .big-goal-text {
      font-size: 15px;
      color: var(--color-text);
      font-weight: 500;
    }
    .big-goal-item.done .big-goal-text {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }
    .delete-btn {
      background: none;
      border: 1px solid transparent;
      color: var(--color-text-muted);
      width: 28px;
      height: 28px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      opacity: 0;
      transition: all 0.15s;
    }
    .big-goal-item:hover .delete-btn { opacity: 1; }
    .delete-btn:hover { border-color: #e74c3c; color: #e74c3c; }
    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 14px;
      border: 1px dashed var(--color-border);
      border-radius: 8px;
    }
  `]
})
export class BigGoalsComponent {
  private readonly tracker = inject(TrackerService);
  private readonly dataService = inject(DataService);
  private readonly rawData = toSignal(this.dataService.getData());

  readonly goals = computed(() => this.tracker.bigGoals());
  readonly newGoalControl = new FormControl('', { nonNullable: true });

  constructor() {
    // Seed from tracker-data.json only once, the first time the user ever opens this
    // page. An empty list is a valid customized state, so we track seeding explicitly
    // rather than inferring it from emptiness — otherwise deleting all goals would
    // restore the defaults on the next refresh.
    effect(() => {
      if (this.tracker.bigGoalsSeeded()) return;
      const d = this.rawData();
      if (!d) return;
      if (d.bigGoals?.length) {
        this.tracker.setBigGoals(d.bigGoals);
      } else {
        this.tracker.markBigGoalsSeeded();
      }
    });
  }

  isChecked(goal: string): boolean {
    return this.tracker.isChecked('biggoal:' + goal);
  }

  toggle(goal: string): void {
    this.tracker.toggle('biggoal:' + goal);
  }

  addGoal(): void {
    const text = this.newGoalControl.value.trim();
    if (!text) return;
    this.tracker.addBigGoal(text);
    this.newGoalControl.setValue('');
  }

  deleteGoal(goal: string): void {
    this.tracker.deleteBigGoal(goal);
  }
}
