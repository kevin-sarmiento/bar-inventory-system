import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AiChatContext } from '../../core/models/ai-chat-context.model';
import { AiInsightsResponseDto, AiReplenishmentSuggestionDto } from '../../core/models/ai-insights.models';
import { Location } from '../../core/models/catalog.models';
import { AiInsightsApiService } from '../../core/services/ai-insights-api.service';
import { LocationApiService } from '../../core/services/catalog-api.service';
import { AiChatPanelComponent } from '../../shared/ui/ai-chat-panel.component';

@Component({
  selector: 'app-intelligence-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor, DecimalPipe, DatePipe, AiChatPanelComponent],
  template: `
    <section class="command-center page-stack">
      <header class="hero-panel shell-card">
        <div class="hero-panel__glow" aria-hidden="true"></div>
        <div class="hero-panel__content">
          <div class="hero-panel__badges">
            <span class="hero-badge hero-badge--pulse">IA local</span>
            <span class="hero-badge">Ollama</span>
            <span class="hero-badge hero-badge--live">Datos en vivo</span>
          </div>
          <h2 class="hero-panel__title">Centro de comando inteligente</h2>
          <p class="hero-panel__subtitle">
            Alertas, reposición sugerida y copiloto conversacional con los datos reales de tu bar.
          </p>
        </div>
        <div class="hero-panel__orb" aria-hidden="true">
          <svg viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="52" stroke="url(#orbGrad)" stroke-width="2" opacity="0.9"/>
            <path d="M40 62h40M60 42v40" stroke="url(#orbGrad)" stroke-width="3" stroke-linecap="round"/>
            <defs>
              <linearGradient id="orbGrad" x1="0" y1="0" x2="120" y2="120">
                <stop stop-color="var(--color-mint)"/>
                <stop offset="1" stop-color="var(--color-lemon)"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
      </header>

      <form
        class="filters-bar shell-card"
        [formGroup]="filters"
        (ngSubmit)="load()"
        [class.filters-bar--loading]="insightsLoading()">
        <div class="filters-bar__label">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M10 18h4v-2h-4v2zm-2-7h8V9H8v2zm2-9h4V5h-4v2z"/>
          </svg>
          <span>Periodo de análisis</span>
        </div>
        <div class="filters-bar__fields">
          <div class="field">
            <label for="filter-from">Desde</label>
            <input id="filter-from" type="date" class="input" formControlName="from">
          </div>
          <div class="field">
            <label for="filter-to">Hasta</label>
            <input id="filter-to" type="date" class="input" formControlName="to">
          </div>
          <div class="field">
            <label for="filter-location">Ubicación</label>
            <select id="filter-location" class="select" formControlName="locationId">
              <option [ngValue]="0">Todas las sedes</option>
              <option *ngFor="let loc of locations()" [ngValue]="loc.id">{{ loc.locationName }}</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary filters-bar__btn" type="submit" [disabled]="insightsLoading()">
          <span *ngIf="!insightsLoading()">Actualizar análisis</span>
          <span *ngIf="insightsLoading()" class="filters-bar__btn-loading">
            <span class="spinner" aria-hidden="true"></span>
            Actualizandoâ€¦
          </span>
        </button>
      </form>

      <div class="loading-shell shell-card" *ngIf="insightsLoading() && !insights()">
        <div class="skeleton skeleton--title"></div>
        <div class="skeleton-row">
          <div class="skeleton skeleton--metric" *ngFor="let _ of [1,2,3,4]"></div>
        </div>
        <div class="skeleton skeleton--block"></div>
      </div>

      <ng-container *ngIf="insights() as data">
        <article class="executive-panel shell-card">
          <div class="executive-panel__accent" aria-hidden="true"></div>
          <div class="executive-panel__body">
            <span class="chip chip--glow">Resumen ejecutivo</span>
            <h3>{{ data.locationName || 'Todas las sedes' }}</h3>
            <p class="executive-panel__summary">{{ data.executiveSummary }}</p>
            <small class="executive-panel__meta">
              Periodo {{ data.fromDate }} a {{ data.toDate }} · generado {{ data.generatedAt | date: 'short' }}
            </small>
          </div>
        </article>

        <div class="metrics-grid">
          <article class="metric-tile shell-card metric-tile--alerts">
            <div class="metric-tile__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L1 21h22L12 2zm0 4.2l7.2 12.8H4.8L12 6.2zM11 10h2v5h-2v-5zm0 7h2v2h-2v-2z"/></svg>
            </div>
            <span class="metric-tile__label">Alertas</span>
            <strong class="metric-tile__value">{{ data.metrics.totalAlerts }}</strong>
            <small>{{ data.metrics.criticalAlerts }} críticas · {{ data.metrics.highAlerts }} altas</small>
          </article>
          <article class="metric-tile shell-card metric-tile--buy">
            <div class="metric-tile__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10-12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.2 6.2l-.8-1.4C5.4 3.8 5 3 4 3H2v2h1.2l1.8 3.2 1.2-.7zm9.6 0l1.2.7 1.8-3.2H20V3h-2c-1 0-1.4.8-1.4 1.4l-.8 1.4z"/></svg>
            </div>
            <span class="metric-tile__label">Reposiciones</span>
            <strong class="metric-tile__value">{{ data.metrics.replenishmentSuggestions }}</strong>
            <small>Costo {{ data.metrics.estimatedReplenishmentCost | number: '1.0-0' }}</small>
          </article>
          <article class="metric-tile shell-card metric-tile--stock">
            <div class="metric-tile__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6h6V4H9v2z"/></svg>
            </div>
            <span class="metric-tile__label">Stock bajo</span>
            <strong class="metric-tile__value">{{ data.metrics.lowStockAlerts }}</strong>
            <small>Productos bajo mínimo</small>
          </article>
          <article class="metric-tile shell-card metric-tile--anomaly">
            <div class="metric-tile__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
            </div>
            <span class="metric-tile__label">Anomalías</span>
            <strong class="metric-tile__value">{{ data.metrics.wasteAlerts + data.metrics.countDifferenceAlerts }}</strong>
            <small>Mermas y conteos</small>
          </article>
        </div>

        <div class="command-layout">
          <div class="command-main">
            <section class="analysis-grid">
              <article class="panel-card shell-card">
                <header class="panel-card__head">
                  <div class="panel-card__icon panel-card__icon--alert" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L1 21h22L12 2zm0 4.2l7.2 12.8H4.8L12 6.2z"/></svg>
                  </div>
                  <div>
                    <h3>Prioridades detectadas</h3>
                    <p>Acciones recomendadas por severidad y urgencia.</p>
                  </div>
                </header>

                <div class="empty-panel" *ngIf="!data.alerts.length">
                  <div class="empty-panel__icon" aria-hidden="true">âœ“</div>
                  <p>No hay alertas relevantes para el periodo seleccionado.</p>
                </div>

                <div
                  class="alert-card"
                  *ngFor="let alert of data.alerts"
                  [class.alert-card--critical]="alert.severity === 'CRITICAL'"
                  [class.alert-card--high]="alert.severity === 'HIGH'">
                  <div class="alert-card__head">
                    <strong>{{ alert.title }}</strong>
                    <span [class]="severityClass(alert.severity)">{{ severityLabel(alert.severity) }}</span>
                  </div>
                  <p>{{ alert.message }}</p>
                  <small>{{ alert.recommendedAction }}</small>
                </div>
              </article>

              <article class="panel-card shell-card">
                <header class="panel-card__head">
                  <div class="panel-card__icon panel-card__icon--buy" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-4h7v4zm-2-6H7V7h7v4z"/></svg>
                  </div>
                  <div>
                    <h3>Reposición sugerida</h3>
                    <p>Compra recomendada según consumo, cobertura y mínimo de stock.</p>
                  </div>
                </header>

                <div class="empty-panel" *ngIf="!data.replenishmentSuggestions.length">
                  <div class="empty-panel__icon" aria-hidden="true">â—Ž</div>
                  <p>No hay compras urgentes sugeridas con los datos actuales.</p>
                </div>

                <div class="replenish-card" *ngFor="let item of data.replenishmentSuggestions">
                  <div class="replenish-card__top">
                    <div>
                      <strong>{{ item.productName }}</strong>
                      <span>{{ item.locationName }}</span>
                    </div>
                    <span class="replenish-card__qty">
                      {{ item.recommendedQty | number: '1.0-2' }} {{ item.baseUnit }}
                    </span>
                  </div>
                  <div class="replenish-card__stats">
                    <span>Stock {{ item.currentStock | number: '1.0-2' }}</span>
                    <span>Cobertura {{ coverageLabel(item) }}</span>
                  </div>
                  <p>{{ item.reason }}</p>
                </div>
              </article>
            </section>
          </div>

          <app-ai-chat-panel variant="embedded" [context]="chatContext()" />
        </div>
      </ng-container>
    </section>
  `,
  styles: [`
    :host {
      --ai-glow: rgba(62, 180, 137, 0.35);
      --ai-glow-warm: rgba(244, 211, 94, 0.28);
      display: block;
    }

    .command-center {
      gap: 1.1rem;
    }

    /* Hero */
    .hero-panel {
      position: relative;
      overflow: hidden;
      padding: 1.6rem 1.75rem;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 1rem;
      align-items: center;
      background:
        linear-gradient(135deg, rgba(62, 180, 137, 0.14), rgba(244, 211, 94, 0.1) 48%, rgba(238, 108, 77, 0.06) 100%),
        var(--color-surface);
    }

    .hero-panel__glow {
      position: absolute;
      inset: -40% auto auto -20%;
      width: 320px;
      height: 320px;
      background: radial-gradient(circle, var(--ai-glow), transparent 68%);
      pointer-events: none;
      animation: pulseGlow 6s ease-in-out infinite;
    }

    .hero-panel__content {
      position: relative;
      z-index: 1;
    }

    .hero-panel__badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }

    .hero-badge {
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      border: 1px solid rgba(41, 50, 65, 0.12);
      background: rgba(255, 255, 255, 0.55);
      color: var(--color-ocean);
    }

    .hero-badge--pulse {
      background: linear-gradient(135deg, rgba(62, 180, 137, 0.22), rgba(244, 211, 94, 0.2));
      animation: chipPulse 2.8s ease-in-out infinite;
    }

    .hero-badge--live::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      margin-right: 0.35rem;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.25);
      vertical-align: middle;
      animation: liveBlink 1.4s ease-in-out infinite;
    }

    .hero-panel__title {
      margin: 0;
      font-family: 'Sora', sans-serif;
      font-size: clamp(1.65rem, 3vw, 2.15rem);
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .hero-panel__subtitle {
      margin: 0.55rem 0 0;
      max-width: 38rem;
      color: var(--color-muted);
      font-size: 1rem;
      line-height: 1.55;
    }

    .hero-panel__orb {
      width: 88px;
      height: 88px;
      opacity: 0.9;
      animation: floatOrb 5s ease-in-out infinite;
    }

    /* Filters */
    .filters-bar {
      position: sticky;
      top: 0.75rem;
      z-index: 20;
      padding: 1rem 1.15rem;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 1rem;
      align-items: end;
      transition: opacity 220ms ease, box-shadow 220ms ease;
    }

    .filters-bar--loading {
      opacity: 0.92;
    }

    .filters-bar__label {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--color-muted);
      padding-bottom: 0.35rem;
    }

    .filters-bar__fields {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.75rem;
    }

    .filters-bar__btn {
      min-width: 11rem;
      align-self: end;
    }

    .filters-bar__btn-loading {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.35);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    /* Executive */
    .executive-panel {
      position: relative;
      overflow: hidden;
      padding: 0;
    }

    .executive-panel__accent {
      height: 4px;
      background: linear-gradient(90deg, var(--color-mint), var(--color-lemon), var(--color-coral));
    }

    .executive-panel__body {
      padding: 1.35rem 1.5rem 1.5rem;
      display: grid;
      gap: 0.55rem;
    }

    .executive-panel__body h3 {
      margin: 0;
      font-family: 'Sora', sans-serif;
      font-size: 1.35rem;
    }

    .executive-panel__summary {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.65;
      color: var(--color-text);
    }

    .executive-panel__meta {
      color: var(--color-muted);
    }

    .chip--glow {
      width: fit-content;
      background: linear-gradient(135deg, rgba(62, 180, 137, 0.18), rgba(244, 211, 94, 0.16));
      border-color: rgba(62, 180, 137, 0.25);
    }

    /* Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .metric-tile {
      padding: 1.05rem 1.1rem;
      display: grid;
      gap: 0.35rem;
      transition: transform 220ms ease, box-shadow 220ms ease;
    }

    .metric-tile:hover {
      transform: translateY(-3px);
      box-shadow: 0 20px 44px rgba(41, 50, 65, 0.14);
    }

    .metric-tile__icon {
      width: 2rem;
      height: 2rem;
      border-radius: 12px;
      display: grid;
      place-items: center;
    }

    .metric-tile__icon svg {
      width: 1.15rem;
      height: 1.15rem;
    }

    .metric-tile--alerts .metric-tile__icon {
      background: rgba(225, 29, 72, 0.12);
      color: #be123c;
    }

    .metric-tile--buy .metric-tile__icon {
      background: rgba(62, 180, 137, 0.14);
      color: #0f766e;
    }

    .metric-tile--stock .metric-tile__icon {
      background: rgba(217, 119, 6, 0.14);
      color: #b45309;
    }

    .metric-tile--anomaly .metric-tile__icon {
      background: rgba(79, 70, 229, 0.12);
      color: #4f46e5;
    }

    .metric-tile__label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      font-weight: 800;
      color: var(--color-muted);
    }

    .metric-tile__value {
      font-family: 'Sora', sans-serif;
      font-size: 1.65rem;
      line-height: 1.1;
    }

    .metric-tile small {
      color: var(--color-muted);
      font-size: 0.8rem;
    }

  .metric-tile--alerts strong { color: #be123c; }
  .metric-tile--buy strong { color: #0f766e; }
  .metric-tile--stock strong { color: #b45309; }
  .metric-tile--anomaly strong { color: #4f46e5; }

    /* Layout */
    .command-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
      gap: 1rem;
      align-items: start;
    }

    .command-main {
      min-width: 0;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 1rem;
    }

    .panel-card {
      padding: 1.15rem;
      display: grid;
      gap: 0.85rem;
    }

    .panel-card__head {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .panel-card__head h3,
    .panel-card__head p {
      margin: 0;
    }

    .panel-card__head p {
      margin-top: 0.2rem;
      color: var(--color-muted);
      font-size: 0.88rem;
    }

    .panel-card__icon {
      width: 2.35rem;
      height: 2.35rem;
      border-radius: 12px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .panel-card__icon svg {
      width: 1.2rem;
      height: 1.2rem;
    }

    .panel-card__icon--alert {
      background: rgba(238, 108, 77, 0.14);
      color: var(--color-coral);
    }

    .panel-card__icon--buy {
      background: rgba(62, 180, 137, 0.14);
      color: var(--color-mint);
    }


    /* Alerts & replenishment */
    .alert-card,
    .replenish-card {
      border-radius: 14px;
      padding: 0.9rem;
      border: 1px solid rgba(41, 50, 65, 0.1);
      background: rgba(255, 255, 255, 0.55);
      display: grid;
      gap: 0.4rem;
      transition: border-color 200ms ease, box-shadow 200ms ease;
    }

    .alert-card:hover,
    .replenish-card:hover {
      box-shadow: 0 10px 24px rgba(41, 50, 65, 0.08);
    }

    .alert-card--critical {
      border-color: rgba(225, 29, 72, 0.35);
      box-shadow: 0 0 0 1px rgba(225, 29, 72, 0.12);
    }

    .alert-card--high {
      border-color: rgba(217, 119, 6, 0.32);
    }

    .alert-card__head {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .alert-card p,
    .replenish-card p {
      margin: 0;
      line-height: 1.5;
    }

    .alert-card small,
    .replenish-card span,
    .replenish-card small {
      color: var(--color-muted);
    }

    .severity-badge {
      border-radius: 999px;
      padding: 0.22rem 0.55rem;
      font-size: 0.68rem;
      font-weight: 800;
      white-space: nowrap;
      background: rgba(41, 50, 65, 0.08);
    }

    .severity-badge--critical {
      color: #be123c;
      background: rgba(225, 29, 72, 0.14);
    }

    .severity-badge--high {
      color: #b45309;
      background: rgba(217, 119, 6, 0.16);
    }

    .severity-badge--medium {
      color: #0f766e;
      background: rgba(13, 148, 136, 0.14);
    }

    .replenish-card__top {
      display: flex;
      justify-content: space-between;
      gap: 0.65rem;
      align-items: flex-start;
    }

    .replenish-card__top strong {
      display: block;
    }

    .replenish-card__qty {
      font-weight: 800;
      color: var(--color-mint);
      white-space: nowrap;
    }

    .replenish-card__stats {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.75rem;
      font-size: 0.8rem;
      color: var(--color-muted);
    }

    .empty-panel {
      text-align: center;
      padding: 1.25rem;
      border: 1px dashed rgba(41, 50, 65, 0.16);
      border-radius: 14px;
      color: var(--color-muted);
      display: grid;
      gap: 0.45rem;
      justify-items: center;
    }

    .empty-panel__icon {
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 1.1rem;
      font-weight: 800;
      background: rgba(62, 180, 137, 0.12);
      color: var(--color-mint);
    }

    /* Loading skeleton */
    .loading-shell {
      padding: 1.25rem;
      display: grid;
      gap: 0.85rem;
    }

    .skeleton-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.65rem;
    }

    .skeleton {
      border-radius: 12px;
      background: linear-gradient(
        90deg,
        rgba(41, 50, 65, 0.06) 25%,
        rgba(41, 50, 65, 0.12) 50%,
        rgba(41, 50, 65, 0.06) 75%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }

    .skeleton--title { height: 2rem; width: 55%; }
    .skeleton--metric { height: 5.5rem; }
    .skeleton--block { height: 12rem; }

    /* Dark theme */
    :host-context(:root[data-theme='dark']) .hero-panel {
      background:
        linear-gradient(135deg, rgba(62, 180, 137, 0.12), rgba(20, 28, 39, 0.95) 55%, rgba(238, 108, 77, 0.08) 100%),
        var(--color-surface);
    }

    :host-context(:root[data-theme='dark']) .hero-badge {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.1);
      color: var(--color-text);
    }

    :host-context(:root[data-theme='dark']) .metric-tile:hover {
      box-shadow: 0 22px 48px rgba(0, 0, 0, 0.35);
    }


    :host-context(:root[data-theme='dark']) .alert-card,
    :host-context(:root[data-theme='dark']) .replenish-card {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
    }

    :host-context(:root[data-theme='dark']) .severity-badge--critical { color: #ff7e9e; }
    :host-context(:root[data-theme='dark']) .severity-badge--high { color: #ffbd66; }
    :host-context(:root[data-theme='dark']) .severity-badge--medium { color: #59e1d5; }

    :host-context(:root[data-theme='dark']) .metric-tile--alerts strong { color: #ff7e9e; }
    :host-context(:root[data-theme='dark']) .metric-tile--buy strong { color: #59e1d5; }
    :host-context(:root[data-theme='dark']) .metric-tile--stock strong { color: #ffbd66; }
    :host-context(:root[data-theme='dark']) .metric-tile--anomaly strong { color: #a5b4fc; }

    @keyframes pulseGlow {
      0%, 100% { opacity: 0.45; transform: scale(1); }
      50% { opacity: 0.85; transform: scale(1.08); }
    }

    @keyframes chipPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(62, 180, 137, 0); }
      50% { box-shadow: 0 0 0 6px rgba(62, 180, 137, 0.18); }
    }

    @keyframes liveBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.45; }
    }

    @keyframes floatOrb {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @media (max-width: 1200px) {
      .command-layout {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 1024px) {
      .hero-panel {
        grid-template-columns: 1fr;
      }

      .hero-panel__orb {
        display: none;
      }

      .filters-bar {
        grid-template-columns: 1fr;
      }

      .filters-bar__fields,
      .metrics-grid,
      .analysis-grid,
      .skeleton-row {
        grid-template-columns: 1fr 1fr;
      }

      .filters-bar__btn {
        width: 100%;
      }
    }

    @media (max-width: 640px) {
      .metrics-grid,
      .analysis-grid,
      .filters-bar__fields,
      .skeleton-row {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntelligencePageComponent implements OnInit {
  private readonly aiApi = inject(AiInsightsApiService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly insights = signal<AiInsightsResponseDto | null>(null);
  protected readonly insightsLoading = signal(false);
  protected readonly locations = signal<Location[]>([]);

  protected readonly filters = this.fb.nonNullable.group({
    from: [this.daysAgo(30)],
    to: [this.today()],
    locationId: [0]
  });

  protected readonly chatContext = computed((): AiChatContext => {
    const raw = this.filters.getRawValue();
    return {
      from: raw.from || undefined,
      to: raw.to || undefined,
      locationId: raw.locationId || undefined
    };
  });

  ngOnInit(): void {
    this.locationsApi.list().subscribe((locations) => this.locations.set(locations));
    this.load();
  }

  protected load(): void {
    const raw = this.filters.getRawValue();
    this.insightsLoading.set(true);
    this.aiApi.getInsights(raw.from || undefined, raw.to || undefined, raw.locationId || undefined)
      .pipe(finalize(() => this.insightsLoading.set(false)))
      .subscribe((data) => this.insights.set(data));
  }

  protected severityClass(severity: string): string {
    return `severity-badge severity-badge--${severity.toLowerCase()}`;
  }

  protected severityLabel(severity: string): string {
    const labels: Record<string, string> = {
      CRITICAL: 'Crítica',
      HIGH: 'Alta',
      MEDIUM: 'Media',
      LOW: 'Baja'
    };
    return labels[severity] ?? severity;
  }

  protected coverageLabel(item: AiReplenishmentSuggestionDto): string {
    return item.daysCoverage === null || item.daysCoverage === undefined
      ? 'sin consumo'
      : `${item.daysCoverage.toFixed(1)} días`;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  }
}
