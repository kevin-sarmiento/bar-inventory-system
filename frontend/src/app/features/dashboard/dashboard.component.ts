import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { DashboardCard } from '../../core/models/dashboard.models';
import { DashboardSummaryDto } from '../../core/models/report.models';
import { ReportApiService } from '../../core/services/report-api.service';
import { StatCardComponent } from '../../shared/ui/stat-card.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgFor, NgIf, StatCardComponent],
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

      <div class="stats-grid">
        <app-stat-card
          *ngFor="let card of cards"
          [title]="card.title"
          [value]="card.value"
          [helper]="card.helper"
          [tone]="card.tone"
        />
      </div>

      <article class="insight shell-card" *ngIf="summary() as summary">
        <h3>Resumen del dia</h3>
        <p>
          Fecha {{ summary.reportDate }}. Ventas: {{ summary.salesCount }}, ticket promedio: {{ summary.averageTicket }},
          existencias bajas: {{ summary.lowStockItems }}.
        </p>
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

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }

    .insight {
      padding: 1.4rem;
    }

    .insight h3 {
      margin: 0 0 0.5rem;
      font-family: 'Sora', sans-serif;
    }

    .insight p {
      margin: 0;
      color: var(--color-muted);
    }

    app-stat-card {
      animation: cardRise 480ms ease both;
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

    @keyframes cardRise {
      from {
        opacity: 0;
        transform: translateY(14px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 1024px) {
      .hero,
      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly reportsApi = inject(ReportApiService);
  protected readonly summary = signal<DashboardSummaryDto | null>(null);
  protected cards: DashboardCard[] = [
    { title: 'Inventario', value: '24/7', helper: 'Consulta permanente del estado general.', tone: 'mint' },
    { title: 'Modulos', value: '13', helper: 'Acceso centralizado a las areas del sistema.', tone: 'lemon' },
    { title: 'Operacion', value: 'Activa', helper: 'Seguimiento visual de la actividad diaria.', tone: 'coral' },
    { title: 'Control', value: 'Total', helper: 'Vista general del negocio en un solo lugar.', tone: 'ocean' }
  ];

  ngOnInit(): void {
    this.reportsApi.getDailyDashboard().subscribe((summary) => {
      this.summary.set(summary);
      this.cards = [
        { title: 'Ventas del dia', value: String(summary.salesCount), helper: 'Registros acumulados del dia', tone: 'mint' },
        { title: 'Venta total', value: String(summary.salesTotal), helper: 'Monto total registrado', tone: 'lemon' },
        { title: 'Existencias bajas', value: String(summary.lowStockItems), helper: 'Productos que requieren atencion', tone: 'coral' },
        { title: 'Inventario', value: String(summary.inventoryValue), helper: 'Valor estimado disponible', tone: 'ocean' }
      ];
    });
  }

}
