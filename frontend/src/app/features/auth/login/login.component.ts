import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <section class="login-shell">
      <article class="login-panel shell-card fade-in">
        <div class="hero-copy">
          <strong class="brand-title">SAKE</strong>
          <p>Administra inventario, productos, ventas y movimientos diarios desde una sola plataforma clara, agil y lista para trabajar.</p>
        </div>

        <div class="hero-image">
          <div class="hero-image-frame">
            <img src="assets/brand/sake-neon.png" alt="SAKE">
          </div>
        </div>
      </article>

      <article class="form-panel shell-card fade-in">
        <div class="form-copy">
          <p class="eyebrow">Bienvenido</p>
          <h2>Iniciar sesion</h2>
          <p class="helper">Ingresa con tu usuario y contrasena para continuar.</p>
        </div>

        <form [formGroup]="form" class="form-grid" (ngSubmit)="submit()">
          <div class="field">
            <label for="username">Usuario</label>
            <input id="username" class="input" formControlName="username" placeholder="admin">
            <span class="field-error" *ngIf="form.controls.username.touched && form.controls.username.invalid">El usuario es obligatorio.</span>
          </div>

          <div class="field">
            <label for="password">Contrasena</label>
            <input id="password" type="password" class="input" formControlName="password" placeholder="********">
            <span class="field-error" *ngIf="form.controls.password.touched && form.controls.password.invalid">La contrasena es obligatoria.</span>
          </div>

          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading()">
            {{ loading() ? 'Ingresando...' : 'Entrar' }}
          </button>
        </form>
      </article>
    </section>
  `,
  styles: [`
    .login-shell {
      min-height: 100vh;
      display: grid;
      grid-template-columns: 1.3fr 0.9fr;
      gap: 1rem;
      padding: 1rem;
      align-items: stretch;
    }

    .login-panel,
    .form-panel {
      padding: 2rem;
    }

    .form-panel {
      display: grid;
      align-content: center;
      min-height: calc(100vh - 2rem);
      padding-block: 3rem;
    }

    .login-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      align-items: center;
      background:
        radial-gradient(circle at top left, rgba(244, 211, 94, 0.2), transparent 28%),
        radial-gradient(circle at bottom right, rgba(62, 180, 137, 0.22), transparent 34%),
        rgba(255, 255, 255, 0.86);
    }

    .brand-title {
      display: inline-block;
      margin: 1rem 0 1rem;
      font-family: 'Sora', sans-serif;
      font-size: clamp(2.8rem, 5vw, 5rem);
      line-height: 1;
      color: #d62828;
      text-shadow: 0 8px 24px rgba(214, 40, 40, 0.16);
      letter-spacing: 0.08em;
    }

    .hero-copy p,
    .helper {
      margin: 0;
      color: var(--color-muted);
      max-width: 28rem;
    }

    .hero-image {
      display: grid;
      place-items: center;
    }

    .hero-image-frame {
      width: min(100%, 420px);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      padding: 0.5rem;
      background: transparent;
    }

    img {
      width: 100%;
      object-fit: contain;
      mix-blend-mode: multiply;
      filter: drop-shadow(0 12px 28px rgba(41, 50, 65, 0.12));
    }

    h2 {
      margin: 0;
      font-family: 'Sora', sans-serif;
      font-size: 2rem;
    }

    .form-copy {
      display: grid;
      gap: 0.45rem;
      margin-bottom: 1.5rem;
    }

    .eyebrow {
      margin: 0 0 0.4rem;
      color: var(--color-mint);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
    }

    @media (max-width: 1024px) {
      .login-shell,
      .login-panel {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly loading = signal(false);
  protected readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  protected submit(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.login(this.form.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.feedback.success('Sesion iniciada', 'Bienvenido.');
          void this.router.navigate(['/dashboard']);
        }
      });
  }
}
