import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AiInsightsResponseDto } from '../../core/models/ai-insights.models';
import { DashboardSummaryDto } from '../../core/models/report.models';
import { AuthService } from '../../core/services/auth.service';
import { AiInsightsApiService } from '../../core/services/ai-insights-api.service';
import { ReportApiService } from '../../core/services/report-api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, RouterLink],
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
          <div class="hero-art-frame">
            <img src="assets/brand/sake-neon.png" alt="SAKE">
          </div>
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

      <article class="insight shell-card ai-summary" *ngIf="insights() as ai">
        <div class="ai-summary__glow" aria-hidden="true"></div>
        <header class="ai-summary__head">
          <div class="ai-summary__intro">
            <div class="ai-summary__title-row">
              <span class="chip ai-summary__chip">IA local · Ollama</span>
              <span class="ai-summary__live" aria-label="Datos en vivo">En vivo</span>
            </div>
            <h3>Asistente</h3>
            <p class="ai-summary__summary">{{ ai.executiveSummary }}</p>
          </div>
          <a class="btn btn-primary ai-summary__cta" routerLink="/intelligence">
            Ver asistente completo
            <span class="ai-summary__cta-arrow" aria-hidden="true">→</span>
          </a>
        </header>

        <div class="ai-summary__grid">
          <div class="ai-summary__metric ai-summary__metric--alerts">
            <div class="ai-summary__metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L1 21h22L12 2zm0 4.2l7.2 12.8H4.8L12 6.2z"/></svg>
            </div>
            <span>Alertas</span>
            <strong>{{ ai.metrics.totalAlerts }}</strong>
            <div class="ai-summary__bars" aria-hidden="true">
              <span class="ai-summary__bar ai-summary__bar--critical" [style.flex]="ai.metrics.criticalAlerts || 0.1"></span>
              <span class="ai-summary__bar ai-summary__bar--high" [style.flex]="ai.metrics.highAlerts || 0.1"></span>
            </div>
            <small>{{ ai.metrics.criticalAlerts }} críticas · {{ ai.metrics.highAlerts }} altas</small>
          </div>
          <div class="ai-summary__metric ai-summary__metric--buy" *ngIf="!bartenderAiOnly()">
            <div class="ai-summary__metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10-12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 6.2l-.8-1.4C5.4 3.8 5 3 4 3H2v2h1.2l1.8 3.2 1.2-.7z"/></svg>
            </div>
            <span>Reposiciones</span>
            <strong>{{ ai.metrics.replenishmentSuggestions }}</strong>
            <small>Costo {{ ai.metrics.estimatedReplenishmentCost | number: '1.0-0' }}</small>
          </div>
          <div class="ai-summary__metric ai-summary__metric--stock">
            <div class="ai-summary__metric-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>
            </div>
            <span>Stock bajo</span>
            <strong>{{ ai.metrics.lowStockAlerts }}</strong>
            <small>Productos por reponer</small>
          </div>
          <div class="ai-summary__priorities">
            <strong>Prioridades</strong>
            <p *ngIf="!topOperationalAlerts().length">Sin alertas urgentes por ahora.</p>
            <ul *ngIf="topOperationalAlerts().length">
              <li *ngFor="let alert of topOperationalAlerts()" [class]="priorityClass(alert.severity)">
                <span class="ai-summary__severity">{{ severityShort(alert.severity) }}</span>
                {{ alert.title }}
              </li>
            </ul>
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

    .hero-art-frame {
      width: min(100%, 320px);
      aspect-ratio: 1;
      display: grid;
      place-items: center;
      padding: 0.2rem;
      border-radius: 999px;
      overflow: hidden;
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.84) 68%, rgba(255, 255, 255, 0.2) 82%, rgba(255, 255, 255, 0) 100%);
      box-shadow:
        0 16px 34px rgba(41, 50, 65, 0.08),
        inset 0 0 0 1px rgba(255, 255, 255, 0.42);
    }

    .hero-art img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 999px;
      clip-path: circle(49.1% at 50% 50%);
      transform: scale(1.015);
      mix-blend-mode: multiply;
      filter: drop-shadow(0 14px 26px rgba(41, 50, 65, 0.12));
      animation: floatGlow 5s ease-in-out infinite;
    }

    .daily-summary {
      padding: 1.35rem 1.5rem;
    }

    .ai-summary {
      position: relative;
      overflow: hidden;
      padding: 1.35rem 1.5rem;
      display: grid;
      gap: 1rem;
      background:
        linear-gradient(135deg, rgba(62, 180, 137, 0.12), rgba(244, 211, 94, 0.08) 45%, transparent 70%),
        var(--color-surface);
      border: 1px solid rgba(62, 180, 137, 0.22);
      box-shadow: 0 18px 48px rgba(41, 50, 65, 0.1);
    }

    .ai-summary__glow {
      position: absolute;
      top: -40%;
      right: -10%;
      width: 280px;
      height: 280px;
      background: radial-gradient(circle, rgba(62, 180, 137, 0.28), transparent 68%);
      pointer-events: none;
    }

    .daily-summary__head {
      margin-bottom: 1.1rem;
    }

    .ai-summary__head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
    }

    .daily-summary__head h3 {
      margin: 0 0 0.25rem;
      font-family: 'Sora', sans-serif;
      font-size: 1.2rem;
    }

    .ai-summary__intro,
    .ai-summary__priorities p {
      margin: 0;
    }

    .ai-summary__title-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.35rem;
    }

    .ai-summary__chip {
      background: linear-gradient(135deg, rgba(62, 180, 137, 0.2), rgba(244, 211, 94, 0.16));
    }

    .ai-summary__live {
      font-size: 0.68rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #15803d;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .ai-summary__live::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
    }

    .ai-summary__head h3 {
      margin: 0;
      font-family: 'Sora', sans-serif;
      font-size: 1.35rem;
    }

    .ai-summary__summary {
      margin-top: 0.45rem;
      color: var(--color-muted);
      max-width: 52rem;
      line-height: 1.55;
    }

    .ai-summary__cta {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      white-space: nowrap;
      box-shadow: 0 10px 28px rgba(62, 180, 137, 0.28);
      transition: transform 200ms ease, box-shadow 200ms ease;
    }

    .ai-summary__cta:hover {
      transform: translateY(-2px);
      box-shadow: 0 14px 32px rgba(62, 180, 137, 0.35);
    }

    .ai-summary__cta-arrow {
      transition: transform 200ms ease;
    }

    .ai-summary__cta:hover .ai-summary__cta-arrow {
      transform: translateX(3px);
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

    .ai-summary__grid {
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

    .ai-summary__metric,
    .ai-summary__priorities {
      border-radius: 18px;
      padding: 1rem 1.05rem;
      display: grid;
      gap: 0.35rem;
      border: 1px solid rgba(41, 50, 65, 0.08);
      background: rgba(255, 255, 255, 0.55);
      transition: transform 220ms ease, box-shadow 220ms ease;
    }

    .ai-summary__metric:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(41, 50, 65, 0.1);
    }

    .ai-summary__metric-icon {
      width: 2rem;
      height: 2rem;
      border-radius: 10px;
      display: grid;
      place-items: center;
    }

    .ai-summary__metric-icon svg {
      width: 1.1rem;
      height: 1.1rem;
    }

    .ai-summary__metric--alerts .ai-summary__metric-icon {
      background: rgba(225, 29, 72, 0.12);
      color: #be123c;
    }

    .ai-summary__metric--buy .ai-summary__metric-icon {
      background: rgba(62, 180, 137, 0.14);
      color: #0f766e;
    }

    .ai-summary__metric--stock .ai-summary__metric-icon {
      background: rgba(217, 119, 6, 0.14);
      color: #b45309;
    }

    .ai-summary__bars {
      display: flex;
      gap: 3px;
      height: 5px;
      border-radius: 999px;
      overflow: hidden;
      background: rgba(41, 50, 65, 0.08);
    }

    .ai-summary__bar {
      min-width: 4px;
      border-radius: 999px;
    }

    .ai-summary__bar--critical {
      background: #e11d48;
    }

    .ai-summary__bar--high {
      background: #d97706;
    }

    .daily-summary__label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 700;
      color: var(--color-muted);
    }

    .ai-summary__metric span {
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

    .ai-summary__metric strong {
      font-family: 'Sora', sans-serif;
      font-size: 1.45rem;
      line-height: 1.2;
    }

    .daily-summary__hint {
      font-size: 0.8rem;
      color: var(--color-muted);
    }

    .ai-summary__metric small,
    .ai-summary__priorities p {
      font-size: 0.8rem;
      color: var(--color-muted);
    }

    .ai-summary__priorities ul {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.4rem;
    }

    .ai-summary__priorities li {
      display: flex;
      gap: 0.45rem;
      align-items: flex-start;
      font-size: 0.86rem;
      color: var(--color-muted);
      padding: 0.4rem 0.5rem;
      border-radius: 10px;
      background: rgba(41, 50, 65, 0.04);
    }

    .ai-summary__severity {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.4rem;
      border-radius: 6px;
      flex-shrink: 0;
    }

    .ai-priority--critical .ai-summary__severity {
      background: rgba(225, 29, 72, 0.14);
      color: #be123c;
    }

    .ai-priority--high .ai-summary__severity {
      background: rgba(217, 119, 6, 0.16);
      color: #b45309;
    }

    .ai-priority--medium .ai-summary__severity {
      background: rgba(13, 148, 136, 0.14);
      color: #0f766e;
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

    :host-context(:root[data-theme='dark']) .hero-art-frame {
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 62%, rgba(255, 255, 255, 0.02) 82%, rgba(255, 255, 255, 0) 100%);
      box-shadow:
        0 18px 34px rgba(0, 0, 0, 0.24),
        inset 0 0 0 1px rgba(255, 255, 255, 0.1);
    }

    :host-context(:root[data-theme='dark']) .hero-art img {
      mix-blend-mode: normal;
      opacity: 1;
      filter: saturate(1.04) contrast(1.02) drop-shadow(0 16px 28px rgba(0, 0, 0, 0.22));
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

    :host-context(:root[data-theme='dark']) .ai-summary {
      background:
        linear-gradient(135deg, rgba(62, 180, 137, 0.1), rgba(20, 28, 39, 0.96) 50%),
        var(--color-surface);
      border-color: rgba(62, 180, 137, 0.25);
    }

    :host-context(:root[data-theme='dark']) .ai-summary__live {
      color: #86efac;
    }

    :host-context(:root[data-theme='dark']) .ai-summary__metric,
    :host-context(:root[data-theme='dark']) .ai-summary__priorities {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.1);
    }

    :host-context(:root[data-theme='dark']) .ai-priority--critical .ai-summary__severity {
      color: #ff7e9e;
    }

    :host-context(:root[data-theme='dark']) .ai-priority--high .ai-summary__severity {
      color: #ffbd66;
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
      .daily-summary__grid,
      .ai-summary__grid,
      .ai-summary__head {
        grid-template-columns: 1fr;
      }

      .ai-summary__head {
        display: grid;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly reportsApi = inject(ReportApiService);
  private readonly aiApi = inject(AiInsightsApiService);
  private readonly auth = inject(AuthService);
  protected readonly bartenderAiOnly = this.auth.bartenderAiOnly;
  protected readonly summary = signal<DashboardSummaryDto | null>(null);
  protected readonly insights = signal<AiInsightsResponseDto | null>(null);
  protected readonly topOperationalAlerts = computed(() => this.insights()?.alerts.slice(0, 3) ?? []);

  protected priorityClass(severity: string): string {
    const key = severity.toLowerCase();
    if (key === 'critical' || key === 'high' || key === 'medium') {
      return `ai-priority--${key}`;
    }
    return '';
  }

  protected severityShort(severity: string): string {
    const labels: Record<string, string> = {
      CRITICAL: 'CRIT',
      HIGH: 'ALTA',
      MEDIUM: 'MED',
      LOW: 'BAJA'
    };
    return labels[severity] ?? severity.slice(0, 4);
  }

  ngOnInit(): void {
    this.reportsApi.getDailyDashboard().subscribe((summary) => this.summary.set(summary));
    this.aiApi.getInsights().subscribe((insights) => this.insights.set(insights));
  }

}
