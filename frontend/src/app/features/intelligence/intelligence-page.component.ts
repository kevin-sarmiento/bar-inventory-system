import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AiChatMessage, AiInsightsResponseDto, AiReplenishmentSuggestionDto } from '../../core/models/ai-insights.models';
import { Location } from '../../core/models/catalog.models';
import { AiInsightsApiService } from '../../core/services/ai-insights-api.service';
import { LocationApiService } from '../../core/services/catalog-api.service';

@Component({
  selector: 'app-intelligence-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor, DecimalPipe, DatePipe],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">IA local</span>
          <h2 class="section-title">Inteligencia Operativa</h2>
          <p class="section-subtitle">
            Alertas, reposicion sugerida y resumen ejecutivo calculados con los datos reales del bar.
          </p>
        </div>
      </header>

      <form class="shell-card form-card" [formGroup]="filters" (ngSubmit)="load()">
        <div class="form-grid three-cols">
          <div class="field"><label>Desde</label><input type="date" class="input" formControlName="from"></div>
          <div class="field"><label>Hasta</label><input type="date" class="input" formControlName="to"></div>
          <div class="field">
            <label>Ubicacion</label>
            <select class="select" formControlName="locationId">
              <option [ngValue]="0">Todas</option>
              <option *ngFor="let loc of locations()" [ngValue]="loc.id">{{ loc.locationName }}</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-primary" type="submit">Actualizar analisis</button>
        </div>
      </form>

      <ng-container *ngIf="insights() as data">
        <article class="shell-card executive-card">
          <div>
            <span class="chip">Resumen ejecutivo</span>
            <h3>{{ data.locationName || 'Todas las sedes' }}</h3>
            <p>{{ data.executiveSummary }}</p>
            <small>Periodo {{ data.fromDate }} a {{ data.toDate }} · generado {{ data.generatedAt | date: 'short' }}</small>
          </div>
        </article>

        <div class="metrics-grid">
          <div class="metric-card shell-card">
            <span>Alertas</span>
            <strong>{{ data.metrics.totalAlerts }}</strong>
            <small>{{ data.metrics.criticalAlerts }} criticas · {{ data.metrics.highAlerts }} altas</small>
          </div>
          <div class="metric-card shell-card">
            <span>Reposiciones</span>
            <strong>{{ data.metrics.replenishmentSuggestions }}</strong>
            <small>Costo estimado {{ data.metrics.estimatedReplenishmentCost | number: '1.0-0' }}</small>
          </div>
          <div class="metric-card shell-card">
            <span>Stock bajo</span>
            <strong>{{ data.metrics.lowStockAlerts }}</strong>
            <small>Productos bajo minimo</small>
          </div>
          <div class="metric-card shell-card">
            <span>Anomalias</span>
            <strong>{{ data.metrics.wasteAlerts + data.metrics.countDifferenceAlerts }}</strong>
            <small>Mermas y conteos por revisar</small>
          </div>
        </div>

        <article class="shell-card chat-card">
          <header>
            <div>
              <span class="chip">Chat con Ollama</span>
              <h3>Pregunta sobre tu inventario</h3>
              <p>
            El asistente usa datos del periodo seleccionado; opcionalmente puede combinar
            <strong>busqueda web</strong> (SearxNG) si activas la casilla.
          </p>
            </div>
          </header>

          <div class="chat-messages">
            <div class="empty-state" *ngIf="!chatMessages().length">
              Prueba con: "Que debo comprar primero?" o "Cuales son las alertas mas urgentes?"
            </div>

            <div
              class="chat-message"
              *ngFor="let message of chatMessages()"
              [class.chat-message--user]="message.role === 'user'">
              <strong>{{ message.role === 'user' ? 'Tu' : 'Ollama' }}</strong>
              <p>{{ message.content }}</p>
              <small *ngIf="message.model">Modelo {{ message.model }} · {{ message.generatedAt | date: 'short' }}</small>
              <small *ngIf="message.webSearchUsed" class="web-badge">Incluyo busqueda web (SearxNG)</small>
            </div>
          </div>

          <form class="chat-form" [formGroup]="chatForm" (ngSubmit)="sendMessage()">
            <div class="chat-form__main">
              <textarea
                class="input"
                rows="3"
                formControlName="message"
                placeholder="Escribe tu pregunta para la IA local..."></textarea>
              <label class="web-toggle">
                <input type="checkbox" formControlName="useWebSearch" />
                <span>Buscar en la web (SearxNG)</span>
              </label>
            </div>
            <button class="btn btn-primary" type="submit" [disabled]="chatLoading()">
              {{ chatLoading() ? 'Pensando...' : 'Enviar a Ollama' }}
            </button>
          </form>
        </article>

        <section class="analysis-grid">
          <article class="shell-card list-card">
            <header>
              <h3>Prioridades detectadas</h3>
              <p>Acciones recomendadas por severidad y urgencia.</p>
            </header>

            <div class="empty-state" *ngIf="!data.alerts.length">
              No hay alertas relevantes para el periodo seleccionado.
            </div>

            <div class="alert-item" *ngFor="let alert of data.alerts" [class.alert-item--critical]="alert.severity === 'CRITICAL'">
              <div class="alert-item__head">
                <strong>{{ alert.title }}</strong>
                <span [class]="severityClass(alert.severity)">{{ severityLabel(alert.severity) }}</span>
              </div>
              <p>{{ alert.message }}</p>
              <small>{{ alert.recommendedAction }}</small>
            </div>
          </article>

          <article class="shell-card list-card">
            <header>
              <h3>Reposicion sugerida</h3>
              <p>Compra recomendada segun consumo, cobertura y minimo de stock.</p>
            </header>

            <div class="empty-state" *ngIf="!data.replenishmentSuggestions.length">
              No hay compras urgentes sugeridas con los datos actuales.
            </div>

            <div class="replenishment-item" *ngFor="let item of data.replenishmentSuggestions">
              <div>
                <strong>{{ item.productName }}</strong>
                <span>{{ item.locationName }}</span>
              </div>
              <div class="replenishment-item__numbers">
                <span>Comprar {{ item.recommendedQty | number: '1.0-2' }} {{ item.baseUnit }}</span>
                <small>Stock {{ item.currentStock | number: '1.0-2' }} · cobertura {{ coverageLabel(item) }}</small>
              </div>
              <p>{{ item.reason }}</p>
            </div>
          </article>
        </section>
      </ng-container>
    </section>
  `,
  styles: [`
    .form-card,
    .executive-card,
    .chat-card,
    .list-card {
      padding: 1.25rem;
    }

    .three-cols {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 1rem;
    }

    .executive-card {
      display: grid;
      gap: 0.45rem;
    }

    .executive-card h3,
    .executive-card p {
      margin: 0;
    }

    .executive-card small,
    .metric-card small,
    .list-card header p,
    .alert-item small,
    .replenishment-item span,
    .replenishment-item small {
      color: var(--color-muted);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.85rem;
    }

    .metric-card {
      padding: 1rem;
      display: grid;
      gap: 0.25rem;
    }

    .metric-card span {
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.72rem;
      color: var(--color-muted);
      font-weight: 700;
    }

    .metric-card strong {
      font-family: 'Sora', sans-serif;
      font-size: 1.5rem;
    }

    .analysis-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
      gap: 1rem;
      align-items: start;
    }

    .list-card {
      display: grid;
      gap: 0.9rem;
    }

    .chat-card {
      display: grid;
      gap: 1rem;
    }

    .list-card header h3,
    .list-card header p,
    .chat-card header h3,
    .chat-card header p,
    .chat-message p,
    .alert-item p,
    .replenishment-item p {
      margin: 0;
    }

    .chat-messages {
      display: grid;
      gap: 0.75rem;
      max-height: 420px;
      overflow: auto;
    }

    .chat-message {
      justify-self: start;
      max-width: min(760px, 100%);
      border: 1px solid rgba(41, 50, 65, 0.1);
      border-radius: 18px 18px 18px 6px;
      padding: 0.9rem 1rem;
      background: rgba(255, 255, 255, 0.62);
      display: grid;
      gap: 0.4rem;
    }

    .chat-message--user {
      justify-self: end;
      border-radius: 18px 18px 6px 18px;
      color: white;
      background: linear-gradient(135deg, var(--color-mint), var(--color-ocean));
    }

    .chat-message small {
      color: var(--color-muted);
    }

    .chat-message--user small {
      color: rgba(255, 255, 255, 0.72);
    }

    .chat-form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
      align-items: end;
    }

    .chat-form__main {
      display: grid;
      gap: 0.5rem;
      min-width: 0;
    }

    .web-toggle {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.85rem;
      color: var(--color-muted);
      cursor: pointer;
      user-select: none;
    }

    .web-toggle input {
      width: 1rem;
      height: 1rem;
      accent-color: var(--color-mint);
    }

    .web-badge {
      display: block;
      margin-top: 0.15rem;
      color: var(--color-ocean);
      font-weight: 600;
    }

    :host-context(:root[data-theme='dark']) .web-badge {
      color: var(--color-mint);
    }

    .chat-form textarea {
      resize: vertical;
      min-height: 82px;
    }

    .alert-item,
    .replenishment-item {
      border: 1px solid rgba(41, 50, 65, 0.08);
      border-radius: 16px;
      padding: 0.95rem;
      display: grid;
      gap: 0.45rem;
      background: rgba(255, 255, 255, 0.55);
    }

    .alert-item--critical {
      border-color: rgba(225, 29, 72, 0.28);
    }

    .alert-item__head,
    .replenishment-item,
    .replenishment-item__numbers {
      min-width: 0;
    }

    .alert-item__head {
      display: flex;
      gap: 0.75rem;
      justify-content: space-between;
      align-items: flex-start;
    }

    .severity-badge {
      border-radius: 999px;
      padding: 0.25rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 800;
      white-space: nowrap;
      background: rgba(41, 50, 65, 0.08);
    }

    .severity-badge--critical {
      color: #be123c;
      background: rgba(225, 29, 72, 0.12);
    }

    .severity-badge--high {
      color: #b45309;
      background: rgba(217, 119, 6, 0.14);
    }

    .severity-badge--medium {
      color: #0f766e;
      background: rgba(13, 148, 136, 0.12);
    }

    .replenishment-item > div:first-child,
    .replenishment-item__numbers {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .empty-state {
      color: var(--color-muted);
      border: 1px dashed rgba(41, 50, 65, 0.18);
      border-radius: 16px;
      padding: 1rem;
    }

    :host-context(:root[data-theme='dark']) .alert-item,
    :host-context(:root[data-theme='dark']) .chat-message,
    :host-context(:root[data-theme='dark']) .replenishment-item {
      background: rgba(255, 255, 255, 0.07);
      border-color: rgba(255, 255, 255, 0.1);
    }

    :host-context(:root[data-theme='dark']) .severity-badge--critical {
      color: #ff7e9e;
    }

    :host-context(:root[data-theme='dark']) .severity-badge--high {
      color: #ffbd66;
    }

    :host-context(:root[data-theme='dark']) .severity-badge--medium {
      color: #59e1d5;
    }

    @media (max-width: 1024px) {
      .three-cols,
      .metrics-grid,
      .analysis-grid,
      .chat-form {
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
  protected readonly locations = signal<Location[]>([]);
  protected readonly chatMessages = signal<AiChatMessage[]>([]);
  protected readonly chatLoading = signal(false);
  protected readonly filters = this.fb.nonNullable.group({
    from: [this.daysAgo(30)],
    to: [this.today()],
    locationId: [0]
  });
  protected readonly chatForm = this.fb.nonNullable.group({
    message: [''],
    useWebSearch: [false]
  });

  ngOnInit(): void {
    this.locationsApi.list().subscribe((locations) => this.locations.set(locations));
    this.load();
  }

  protected load(): void {
    const raw = this.filters.getRawValue();
    this.aiApi.getInsights(raw.from || undefined, raw.to || undefined, raw.locationId || undefined)
      .subscribe((data) => this.insights.set(data));
  }

  protected sendMessage(): void {
    const message = this.chatForm.controls.message.value.trim();
    if (!message || this.chatLoading()) {
      return;
    }

    const raw = this.filters.getRawValue();
    const useWeb = this.chatForm.controls.useWebSearch.value;
    this.chatMessages.update((messages) => [...messages, { role: 'user', content: message }]);
    this.chatForm.patchValue({ message: '' });
    this.chatLoading.set(true);

    this.aiApi.sendChat({
      message,
      from: raw.from || undefined,
      to: raw.to || undefined,
      locationId: raw.locationId || undefined,
      useWebSearch: useWeb || undefined
    })
      .pipe(finalize(() => this.chatLoading.set(false)))
      .subscribe({
        next: (response) => this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'assistant',
            content: response.answer,
            generatedAt: response.generatedAt,
            model: response.model,
            webSearchUsed: response.webSearchUsed === true
          }
        ]),
        error: (error) => this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'assistant',
            content: this.chatErrorMessage(error)
          }
        ])
      });
  }

  protected severityClass(severity: string): string {
    const normalized = severity.toLowerCase();
    return `severity-badge severity-badge--${normalized}`;
  }

  protected severityLabel(severity: string): string {
    const labels: Record<string, string> = {
      CRITICAL: 'Critica',
      HIGH: 'Alta',
      MEDIUM: 'Media',
      LOW: 'Baja'
    };
    return labels[severity] ?? severity;
  }

  protected coverageLabel(item: AiReplenishmentSuggestionDto): string {
    return item.daysCoverage === null || item.daysCoverage === undefined
      ? 'sin consumo'
      : `${item.daysCoverage.toFixed(1)} dias`;
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
  }

  private chatErrorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { error?: string; details?: string } | string }).error;
      if (typeof payload === 'string') {
        return payload;
      }
      if (payload?.error) {
        return payload.error;
      }
    }
    return 'No pude conectar con Ollama. Espera a que termine de descargar el modelo o revisa el servicio local.';
  }
}
