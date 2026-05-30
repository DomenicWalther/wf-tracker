import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrackerService } from '../../core/services/tracker.service';
import { PersonalGoal } from '../../core/models/tracker.models';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-personal-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, SectionHeaderComponent],
  template: `
    <div class="page">
      <app-section-header
        title="PERSONAL GOALS"
        description="Set your own custom goals. Number goals track progress toward a target amount. Completion goals are simple checkboxes."
        [completed]="progress().completed"
        [total]="progress().total"
      />

      <div class="goals-section">
        <div class="goals-section-title">Add New Goal</div>
        <div class="add-goal-form">
          <input class="goal-input" type="text" placeholder="Goal description..." [(ngModel)]="newGoalText" />
          <select class="goal-select" [(ngModel)]="newGoalType">
            <option value="checkbox">Completion (checkbox)</option>
            <option value="number">Number target</option>
          </select>
          @if (newGoalType === 'number') {
            <input class="goal-num" type="number" placeholder="Target #" [(ngModel)]="newGoalTarget" min="1" />
          }
          <button class="add-btn" (click)="addGoal()">+ Add</button>
        </div>
      </div>

      @if (goals().length > 0) {
        <div class="goals-section">
          <div class="goals-section-title">Number Goals</div>
          <div class="goals-list">
            @for (goal of numberGoals(); track goal.id) {
              <div class="goal-item">
                <div class="goal-text">{{ goal.goal }}</div>
                <div class="goal-number-track">
                  <input
                    type="number"
                    class="goal-current"
                    [value]="goal.current ?? 0"
                    (change)="updateCurrent(goal, +$any($event.target).value)"
                    min="0"
                  />
                  <span class="goal-sep">/</span>
                  <span class="goal-target">{{ goal.target }}</span>
                </div>
                <div class="mini-progress">
                  <div class="progress-bar-bg" style="height:4px">
                    <div class="progress-bar-fill" [style.width.%]="goalPct(goal)"></div>
                  </div>
                </div>
                <button class="del-btn" (click)="deleteGoal(goal.id)" title="Delete">✕</button>
              </div>
            }
          </div>
        </div>

        <div class="goals-section">
          <div class="goals-section-title">Completion Goals</div>
          <div class="goals-list">
            @for (goal of checkboxGoals(); track goal.id) {
              <div class="goal-item" [class.done]="goal.completed">
                <input
                  type="checkbox"
                  class="wf-checkbox"
                  [checked]="goal.completed"
                  (change)="toggleGoal(goal)"
                />
                <span class="goal-text" [class.struck]="goal.completed">{{ goal.goal }}</span>
                <button class="del-btn" (click)="deleteGoal(goal.id)" title="Delete">✕</button>
              </div>
            }
          </div>
        </div>
      } @else {
        <div class="empty-state">No personal goals yet. Add one above!</div>
      }
    </div>
  `,
  styles: [`
    .page { max-width: 900px; }
    .goals-section { margin-bottom: 24px; }
    .goals-section-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--color-gold);
      margin-bottom: 12px;
    }
    .add-goal-form {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
    }
    .goal-input {
      flex: 1;
      min-width: 220px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 7px 10px;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }
    .goal-input:focus, .goal-select:focus, .goal-num:focus { border-color: var(--color-gold); }
    .goal-select, .goal-num {
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      padding: 7px 10px;
      border-radius: 4px;
      font-size: 13px;
      outline: none;
    }
    .goal-num { width: 100px; }
    .add-btn {
      padding: 7px 16px;
      background: var(--color-gold);
      border: none;
      border-radius: 4px;
      color: #0a0a0f;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .add-btn:hover { background: var(--color-gold-light); }
    .goals-list { display: flex; flex-direction: column; gap: 6px; }
    .goal-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 6px;
    }
    .goal-item.done { opacity: 0.6; }
    .goal-text { flex: 1; font-size: 13px; color: var(--color-text); }
    .goal-text.struck { text-decoration: line-through; color: var(--color-text-muted); }
    .goal-number-track {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .goal-current {
      width: 70px;
      background: var(--color-surface2);
      border: 1px solid var(--color-border);
      color: var(--color-gold);
      padding: 4px 6px;
      border-radius: 3px;
      font-size: 13px;
      text-align: right;
      outline: none;
    }
    .goal-sep { color: var(--color-text-muted); }
    .goal-target { color: var(--color-text-muted); font-size: 13px; min-width: 30px; }
    .mini-progress { width: 80px; }
    .del-btn {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 12px;
      padding: 2px 4px;
    }
    .del-btn:hover { color: var(--color-red); }
    .empty-state { padding: 40px; text-align: center; color: var(--color-text-muted); font-size: 13px; }
  `]
})
export class PersonalGoalsComponent {
  private readonly tracker = inject(TrackerService);

  newGoalText = '';
  newGoalType: 'checkbox' | 'number' = 'checkbox';
  newGoalTarget = 10;

  readonly goals = this.tracker.personalGoals;
  readonly numberGoals = computed(() => this.goals().filter(g => g.type === 'number'));
  readonly checkboxGoals = computed(() => this.goals().filter(g => g.type === 'checkbox'));

  readonly progress = computed(() => {
    const all = this.goals();
    const completed = all.filter(g =>
      g.type === 'checkbox' ? g.completed : (g.current ?? 0) >= (g.target ?? 1)
    ).length;
    return { completed, total: all.length };
  });

  addGoal(): void {
    const text = this.newGoalText.trim();
    if (!text) return;
    const goal: PersonalGoal = {
      id: crypto.randomUUID(),
      goal: text,
      type: this.newGoalType,
      current: this.newGoalType === 'number' ? 0 : undefined,
      target: this.newGoalType === 'number' ? this.newGoalTarget : undefined,
      completed: false
    };
    this.tracker.addPersonalGoal(goal);
    this.newGoalText = '';
    this.newGoalTarget = 10;
  }

  toggleGoal(goal: PersonalGoal): void {
    this.tracker.updatePersonalGoal({ ...goal, completed: !goal.completed });
  }

  updateCurrent(goal: PersonalGoal, current: number): void {
    this.tracker.updatePersonalGoal({ ...goal, current });
  }

  deleteGoal(id: string): void {
    this.tracker.deletePersonalGoal(id);
  }

  goalPct(goal: PersonalGoal): number {
    return goal.target ? Math.min(100, ((goal.current ?? 0) / goal.target) * 100) : 0;
  }
}
