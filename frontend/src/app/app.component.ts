import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { UiFeedbackService } from './core/services/ui-feedback.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NgFor, NgIf],
  template: `
    <router-outlet></router-outlet>

    <section class="toast-stack" *ngIf="feedback.messages().length">
      <article
        *ngFor="let message of feedback.messages()"
        class="toast fade-in"
      >
        <strong>{{ message.title }}</strong>
        <span>{{ message.detail }}</span>
      </article>
    </section>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      display: grid;
      gap: 0.75rem;
      z-index: 2000;
      max-width: min(360px, calc(100vw - 2rem));
    }

    .toast {
      display: grid;
      gap: 0.2rem;
      padding: 1rem 1.1rem;
      border-radius: 18px;
      border: 1px solid rgba(41, 50, 65, 0.12);
      background: rgba(255, 255, 255, 0.94);
      box-shadow: var(--shadow-soft);
    }

    span {
      color: var(--color-muted);
      font-size: 0.88rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent {
  protected readonly feedback = inject(UiFeedbackService);
}
