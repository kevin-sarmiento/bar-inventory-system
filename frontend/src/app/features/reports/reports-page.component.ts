import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { DataColumn } from '../../core/models/api.models';
import { DashboardSummaryDto, MovementReportDto, StockViewDto } from '../../core/models/report.models';
import { AuthService } from '../../core/services/auth.service';
import { DownloadService } from '../../core/services/download.service';
import { ReportApiService } from '../../core/services/report-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { StatCardComponent } from '../../shared/ui/stat-card.component';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, StatCardComponent, NgIf],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 4</span>
          <h2 class="section-title">Reportes y exportaciones</h2>
          <p class="section-subtitle">Consulta el estado del negocio y descarga reportes segun tus permisos.</p>
        </div>
      </header>

      <form class="shell-card form-card" [formGroup]="filters" (ngSubmit)="load()">
        <div class="form-grid four-cols">
          <div class="field"><label>Fecha del panel</label><input type="date" class="input" formControlName="date"></div>
          <div class="field"><label>Desde</label><input type="date" class="input" formControlName="from"></div>
          <div class="field"><label>Hasta</label><input type="date" class="input" formControlName="to"></div>
          <div class="field"><label>ID de ubicacion</label><input type="number" class="input" formControlName="locationId"></div>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="exportStock()">Exportar existencias XLSX</button>
          <button class="btn btn-warning" type="button" (click)="exportMovements()">Exportar movimientos XLSX</button>
          <button class="btn btn-primary" type="submit">Consultar</button>
        </div>

        <div class="actions" *ngIf="canExportManagement()">
          <button class="btn btn-secondary" type="button" (click)="exportWaste()">Exportar mermas</button>
          <button class="btn btn-secondary" type="button" (click)="exportConsumption()">Exportar consumo</button>
          <button class="btn btn-secondary" type="button" (click)="exportShiftSummary()">Exportar turnos CSV</button>
          <button class="btn btn-secondary" type="button" (click)="exportAudit()">Exportar auditoria</button>
        </div>
      </form>

      <div class="stats-grid" *ngIf="dashboard() as info">
        <app-stat-card title="Ventas" [value]="info.salesCount + ''" helper="Ventas del dia" tone="mint" />
        <app-stat-card title="Total" [value]="info.salesTotal + ''" helper="Venta total" tone="lemon" />
        <app-stat-card title="Existencias bajas" [value]="info.lowStockItems + ''" helper="Productos por reponer" tone="coral" />
        <app-stat-card title="Inventario" [value]="info.inventoryValue + ''" helper="Valor estimado" tone="ocean" />
      </div>

      <app-data-table [rows]="stock()" [columns]="stockColumns" [showActions]="false" [emptyTitle]="'Sin stock reportado'" />
      <app-data-table [rows]="movements()" [columns]="movementColumns" [showActions]="false" [emptyTitle]="'Sin movimientos reportados'" />
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.four-cols,.stats-grid{grid-template-columns:repeat(4,minmax(0,1fr));display:grid;gap:1rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}@media (max-width:900px){.four-cols,.stats-grid{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsPageComponent implements OnInit {
  private readonly api = inject(ReportApiService);
  private readonly auth = inject(AuthService);
  private readonly download = inject(DownloadService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canExportManagement = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'GERENTE']));
  protected readonly dashboard = signal<DashboardSummaryDto | null>(null);
  protected readonly stock = signal<StockViewDto[]>([]);
  protected readonly movements = signal<MovementReportDto[]>([]);
  protected readonly stockColumns: DataColumn<StockViewDto>[] = [
    { key: 'productName', label: 'Producto' },
    { key: 'categoryName', label: 'Categoria' },
    { key: 'locationName', label: 'Ubicacion' },
    { key: 'quantityBase', label: 'Cantidad base' },
    { key: 'belowMinStock', label: 'Bajo minimo', type: 'boolean' },
    { key: 'totalValue', label: 'Valor', type: 'currency' }
  ];
  protected readonly movementColumns: DataColumn<MovementReportDto>[] = [
    { key: 'transactionNumber', label: 'Numero' },
    { key: 'transactionType', label: 'Tipo', type: 'badge' },
    { key: 'productName', label: 'Producto' },
    { key: 'quantityBase', label: 'Cantidad base' },
    { key: 'status', label: 'Estado', type: 'badge' }
  ];
  protected readonly filters = this.fb.nonNullable.group({
    date: [''],
    from: [''],
    to: [''],
    locationId: [0]
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    const raw = this.filters.getRawValue();
    const locationId = raw.locationId || undefined;
    this.api.getCurrentStock(locationId).subscribe((data) => this.stock.set(data));
    this.api.getMovements(raw.from || undefined, raw.to || undefined, undefined).subscribe((data) => this.movements.set(data));
    this.api.getDailyDashboard(raw.date || undefined, locationId).subscribe((data) => this.dashboard.set(data));
  }

  protected exportStock(): void {
    const raw = this.filters.getRawValue();
    this.api.download('/stock/export.xlsx', { locationId: raw.locationId || undefined }).subscribe((blob) => {
      this.download.save(blob, 'stock-report.xlsx');
      this.feedback.success('Exportacion lista', 'Se descargo el reporte de existencias.');
    });
  }

  protected exportMovements(): void {
    const raw = this.filters.getRawValue();
    this.api.download('/movements/export.xlsx', { from: raw.from || undefined, to: raw.to || undefined }).subscribe((blob) => {
      this.download.save(blob, 'movements-report.xlsx');
      this.feedback.success('Exportacion lista', 'Se descargo el reporte de movimientos.');
    });
  }

  protected exportWaste(): void {
    const raw = this.filters.getRawValue();
    this.api.download('/waste/export.xlsx', { from: raw.from || undefined, to: raw.to || undefined }).subscribe((blob) => {
      this.download.save(blob, 'waste-report.xlsx');
      this.feedback.success('Exportacion lista', 'Se descargo el reporte de mermas.');
    });
  }

  protected exportConsumption(): void {
    const raw = this.filters.getRawValue();
    this.api.download('/consumption/export.xlsx', { from: raw.from || undefined, to: raw.to || undefined }).subscribe((blob) => {
      this.download.save(blob, 'consumption-report.xlsx');
      this.feedback.success('Exportacion lista', 'Se descargo el reporte de consumo.');
    });
  }

  protected exportShiftSummary(): void {
    const raw = this.filters.getRawValue();
    this.api.download('/shifts/export', { from: raw.from || undefined, to: raw.to || undefined }).subscribe((blob) => {
      this.download.save(blob, 'shift-summary.csv');
      this.feedback.success('Exportacion lista', 'Se descargo el reporte de turnos.');
    });
  }

  protected exportAudit(): void {
    this.api.download('/audit/export.xlsx').subscribe((blob) => {
      this.download.save(blob, 'audit-history.xlsx');
      this.feedback.success('Exportacion lista', 'Se descargo el historial de auditoria.');
    });
  }
}
