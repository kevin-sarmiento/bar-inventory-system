import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  template: `
    <article
      class="card"
      [class.card-ventas]="tone === 'ventas'"
      [class.card-total]="tone === 'total'"
      [class.card-bajas]="tone === 'bajas'"
      [class.card-valor]="tone === 'valor'"
      [class.card-mint]="tone === 'mint'"
      [class.card-lemon]="tone === 'lemon'"
      [class.card-coral]="tone === 'coral'"
      [class.card-ocean]="tone === 'ocean'"
    >
      <p>{{ title }}</p>
      <strong>{{ value }}</strong>
      <span>{{ helper }}</span>
    </article>
  `,
  styles: [`
    .card {
      border-radius: 24px;
      padding: 1.25rem 1.25rem 1.25rem 1.1rem;
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(41, 50, 65, 0.1);
      border-left: 4px solid rgba(62, 180, 137, 0.85);
      box-shadow: var(--shadow-card);
      display: grid;
      gap: 0.4rem;
    }

    .card p {
      margin: 0;
      color: var(--color-muted);
      font-weight: 600;
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .card strong {
      font-family: 'Sora', sans-serif;
      font-size: 1.85rem;
      line-height: 1.15;
      color: var(--color-text);
    }

    .card span {
      color: var(--color-muted);
      font-size: 0.88rem;
    }

    .card-ventas {
      border-left-color: #0d9488;
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.22), rgba(255, 255, 255, 0.94));
    }

    .card-ventas strong {
      color: #0f766e;
    }

    .card-total {
      border-left-color: #d97706;
      background: linear-gradient(135deg, rgba(217, 119, 6, 0.2), rgba(255, 255, 255, 0.94));
    }

    .card-total strong {
      color: #b45309;
    }

    .card-bajas {
      border-left-color: #e11d48;
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.18), rgba(255, 255, 255, 0.94));
    }

    .card-bajas strong {
      color: #be123c;
    }

    .card-valor {
      border-left-color: #4f46e5;
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.18), rgba(255, 255, 255, 0.94));
    }

    .card-valor strong {
      color: #4338ca;
    }

    .card-mint {
      border-left-color: #3eb489;
      background: linear-gradient(180deg, rgba(62, 180, 137, 0.22), rgba(255, 255, 255, 0.92));
    }

    .card-lemon {
      border-left-color: #e6a800;
      background: linear-gradient(180deg, rgba(244, 211, 94, 0.28), rgba(255, 255, 255, 0.92));
    }

    .card-coral {
      border-left-color: #ee6c4d;
      background: linear-gradient(180deg, rgba(238, 108, 77, 0.22), rgba(255, 255, 255, 0.92));
    }

    .card-ocean {
      border-left-color: #3d5a80;
      background: linear-gradient(180deg, rgba(61, 90, 128, 0.2), rgba(255, 255, 255, 0.94));
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatCardComponent {
  @Input({ required: true }) title = '';
  @Input({ required: true }) value = '';
  @Input({ required: true }) helper = '';
  @Input() tone: 'mint' | 'lemon' | 'coral' | 'ocean' | 'ventas' | 'total' | 'bajas' | 'valor' = 'mint';
}
