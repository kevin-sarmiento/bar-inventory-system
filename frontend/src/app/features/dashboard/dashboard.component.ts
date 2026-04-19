import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, NgIf } from '@angular/common';
import { DashboardSummaryDto } from '../../core/models/report.models';
import { ReportApiService } from '../../core/services/report-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, DecimalPipe],
  template: `
    <section class="page-stack">
      <div class="hero shell-card">
        <div class="hero-copy">
          <span class="chip">SAKE</span>
          <h2 class="section-title">Operacion diaria del bar</h2>
          <p class="section-subtitle">
            Consulta de forma rapida el estado general del negocio, las ventas del dia,
            el inventario disponible y los movimientos mas importantes.
          </p>
        </div>

        <div class="hero-art">
          <img src="assets/brand/sake-neon.png" alt="SAKE">
        </div>
      </div>

      <article class="insight shell-card daily-summary" *ngIf="summary() as s">
        <header class="daily-summary__head">
          <h3>Resumen del dia</h3>
          <p class="daily-summary__meta">{{ s.reportDate }}<span *ngIf="s.locationName"> · {{ s.locationName }}</span></p>
        </header>
        <div class="daily-summary__grid">
          <div class="daily-summary__tile daily-summary__tile--sales">
            <span class="daily-summary__label">Ventas</span>
            <strong>{{ s.salesCount }}</strong>
            <span class="daily-summary__hint">Ticket promedio {{ s.averageTicket | number: '1.0-2' }}</span>
          </div>
          <div class="daily-summary__tile daily-summary__tile--money">
            <span class="daily-summary__label">Total vendido</span>
            <strong>{{ s.salesTotal | number: '1.0-0' }}</strong>
            <span class="daily-summary__hint">Monto acumulado del dia</span>
          </div>
          <div class="daily-summary__tile daily-summary__tile--stock">
            <span class="daily-summary__label">Existencias bajas</span>
            <strong>{{ s.lowStockItems }}</strong>
            <span class="daily-summary__hint">Productos por reponer</span>
          </div>
          <div class="daily-summary__tile daily-summary__tile--inv">
            <span class="daily-summary__label">Valor inventario</span>
            <strong>{{ s.inventoryValue | number: '1.0-0' }}</strong>
            <span class="daily-summary__hint">Estimacion en sede</span>
          </div>
        </div>
      </article>
    </section>
  `,
  styles: [`
    .hero {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 1rem;
      align-items: center;
      padding: 1.5rem;
    }

    .hero-art {
      display: grid;
      place-items: center;
    }

    .hero-art img {
      width: min(100%, 320px);
      mix-blend-mode: multiply;
      animation: floatGlow 5s ease-in-out infinite;
    }

    .daily-summary {
      padding: 1.35rem 1.5rem;
    }

    .daily-summary__head {
      margin-bottom: 1.1rem;
    }

    .daily-summary__head h3 {
      margin: 0 0 0.25rem;
      font-family: 'Sora', sans-serif;
      font-size: 1.2rem;
    }

    .daily-summary__meta {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.88rem;
    }

    .daily-summary__grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .daily-summary__tile {
      border-radius: 18px;
      padding: 1rem 1.05rem;
      display: grid;
      gap: 0.35rem;
      border: 1px solid rgba(41, 50, 65, 0.08);
      background: rgba(255, 255, 255, 0.55);
    }

    .daily-summary__label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      color: var(--color-muted);
    }

    .daily-summary__tile strong {
      font-family: 'Sora', sans-serif;
      font-size: 1.45rem;
      line-height: 1.2;
    }

    .daily-summary__hint {
      font-size: 0.8rem;
      color: var(--color-muted);
    }

    .daily-summary__tile--sales {
      border-left: 4px solid #0d9488;
      background: linear-gradient(180deg, rgba(13, 148, 136, 0.12), rgba(255, 255, 255, 0.75));
    }

    .daily-summary__tile--sales strong {
      color: #0f766e;
    }

    .daily-summary__tile--money {
      border-left: 4px solid #d97706;
      background: linear-gradient(180deg, rgba(217, 119, 6, 0.12), rgba(255, 255, 255, 0.75));
    }

    .daily-summary__tile--money strong {
      color: #b45309;
    }

    .daily-summary__tile--stock {
      border-left: 4px solid #e11d48;
      background: linear-gradient(180deg, rgba(225, 29, 72, 0.1), rgba(255, 255, 255, 0.75));
    }

    .daily-summary__tile--stock strong {
      color: #be123c;
    }

    .daily-summary__tile--inv {
      border-left: 4px solid #4f46e5;
      background: linear-gradient(180deg, rgba(79, 70, 229, 0.1), rgba(255, 255, 255, 0.75));
    }

    .daily-summary__tile--inv strong {
      color: #4338ca;
    }

    :host-context(:root[data-theme='dark']) .hero {
      background: linear-gradient(135deg, rgba(21, 33, 47, 0.96), rgba(19, 30, 43, 0.94));
      border-color: rgba(255, 255, 255, 0.08);
    }

    :host-context(:root[data-theme='dark']) .hero-art img {
      mix-blend-mode: screen;
      opacity: 0.98;
      filter: brightness(1.18) saturate(1.12) drop-shadow(0 18px 36px rgba(62, 180, 137, 0.14));
    }

    :host-context(:root[data-theme='dark']) .daily-summary {
      background: linear-gradient(180deg, rgba(22, 33, 47, 0.95), rgba(19, 29, 42, 0.94));
      border-color: rgba(255, 255, 255, 0.08);
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.1);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    }

    :host-context(:root[data-theme='dark']) .daily-summary__label,
    :host-context(:root[data-theme='dark']) .daily-summary__hint {
      color: rgba(235, 243, 255, 0.82);
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--sales {
      background: linear-gradient(180deg, rgba(13, 148, 136, 0.22), rgba(24, 40, 45, 0.92));
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--sales strong {
      color: #59e1d5;
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--money {
      background: linear-gradient(180deg, rgba(217, 119, 6, 0.22), rgba(45, 35, 22, 0.92));
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--money strong {
      color: #ffbd66;
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--stock {
      background: linear-gradient(180deg, rgba(225, 29, 72, 0.2), rgba(45, 22, 33, 0.92));
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--stock strong {
      color: #ff7e9e;
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--inv {
      background: linear-gradient(180deg, rgba(79, 70, 229, 0.22), rgba(28, 31, 52, 0.92));
    }

    :host-context(:root[data-theme='dark']) .daily-summary__tile--inv strong {
      color: #9f97ff;
    }

    @keyframes floatGlow {
      0%, 100% {
        transform: translateY(0px);
        filter: drop-shadow(0 12px 26px rgba(62, 180, 137, 0.10));
      }
      50% {
        transform: translateY(-8px);
        filter: drop-shadow(0 20px 34px rgba(238, 108, 77, 0.16));
      }
    }

    @media (max-width: 1024px) {
      .hero,
      .daily-summary__grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly reportsApi = inject(ReportApiService);
  protected readonly summary = signal<DashboardSummaryDto | null>(null);

  ngOnInit(): void {
    this.reportsApi.getDailyDashboard().subscribe((summary) => this.summary.set(summary));
  }

}
