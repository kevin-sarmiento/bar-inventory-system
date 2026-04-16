import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <article class="card" [class.card-mint]="tone === 'mint'" [class.card-lemon]="tone === 'lemon'" [class.card-coral]="tone === 'coral'" [class.card-ocean]="tone === 'ocean'">
      <p>{{ title }}</p>
      <strong>{{ value }}</strong>
      <span>{{ helper }}</span>
    </article>
  `,
  styles: [`
    .card {
      border-radius: 24px;
      padding: 1.25rem;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(41, 50, 65, 0.1);
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 0.4rem;
    }

    .card p {
      margin: 0;
      color: var(--color-muted);
      font-weight: 600;
    }

    .card strong {
      font-family: 'Sora', sans-serif;
      font-size: 1.8rem;
    }

    .card span {
      color: var(--color-text);
      font-size: 0.92rem;
    }

    .card-mint {
      background: linear-gradient(180deg, rgba(62, 180, 137, 0.18), rgba(255, 255, 255, 0.92));
    }

    .card-lemon {
      background: linear-gradient(180deg, rgba(244, 211, 94, 0.2), rgba(255, 255, 255, 0.92));
    }

    .card-coral {
      background: linear-gradient(180deg, rgba(238, 108, 77, 0.18), rgba(255, 255, 255, 0.92));
    }

    .card-ocean {
      background: linear-gradient(180deg, rgba(41, 50, 65, 0.14), rgba(255, 255, 255, 0.94));
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value = '';
  @Input({ required: true }) helper = '';
  @Input() tone: 'mint' | 'lemon' | 'coral' | 'ocean' = 'mint';
}
