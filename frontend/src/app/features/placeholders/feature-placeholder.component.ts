import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-feature-placeholder',
  standalone: true,
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">{{ tag }}</span>
          <h2 class="section-title">{{ title }}</h2>
          <p class="section-subtitle">{{ description }}</p>
        </div>
      </header>

      <article class="shell-card placeholder">
        <img src="assets/brand/sake-neon.png" alt="Identidad tropical SAKE">
        <p>Este espacio queda listo para implementar la siguiente pantalla sin tocar el backend existente.</p>
      </article>
    </section>
  `,
  styles: [`
    .placeholder {
      padding: 2rem;
      display: grid;
      gap: 1rem;
      place-items: center;
      text-align: center;
    }

    img {
      width: min(100%, 260px);
      opacity: 0.92;
    }

    p {
      color: var(--color-muted);
      max-width: 48ch;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FeaturePlaceholderComponent {
  private readonly route = inject(ActivatedRoute);
  protected readonly title = this.route.snapshot.data['title'] as string;
  protected readonly description = this.route.snapshot.data['description'] as string;
  protected readonly tag = this.route.snapshot.data['tag'] as string;
}
