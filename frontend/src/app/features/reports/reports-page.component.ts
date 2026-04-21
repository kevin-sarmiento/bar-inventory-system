import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, catchError, forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Location } from '../../core/models/catalog.models';
import { MovementReportDto, StockViewDto } from '../../core/models/report.models';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService } from '../../core/services/catalog-api.service';
import { DownloadService } from '../../core/services/download.service';
import { ReportApiService } from '../../core/services/report-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { inventoryTransactionStatusEs, inventoryTransactionTypeEs } from '../../shared/i18n/operations-labels';
import { DataTableComponent } from '../../shared/ui/data-table.component';

type MovementRow = MovementReportDto & { displayType: string; displayStatus: string };

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgIf, NgFor],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 4</span>
          <h2 class="section-title">Reportes y exportaciones</h2>
          <p class="section-subtitle">Consultas y descargas segun permisos.</p>
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

        <div class="export-toolbar">
          <button class="btn btn-secondary" type="button" (click)="exportStock()">Existencias XLSX</button>
          <button class="btn btn-warning" type="button" (click)="exportMovements()">Movimientos XLSX</button>
          <button class="btn btn-primary" type="submit">Consultar</button>
        </div>

        <div class="export-toolbar export-toolbar--secondary" *ngIf="canExportManagement()">
          <button class="btn btn-secondary" type="button" (click)="exportWaste()">Mermas</button>
          <button class="btn btn-secondary" type="button" (click)="exportConsumption()">Consumo</button>
          <button class="btn btn-secondary" type="button" (click)="exportShiftXlsx()">Turnos XLSX</button>
          <button class="btn btn-secondary" type="button" (click)="exportShiftCsv()">Turnos CSV</button>
          <button class="btn btn-secondary" type="button" (click)="exportAudit()">Auditoria XLSX</button>
        </div>
      </form>

      <div class="reports-tables">
        <app-data-table
          [rows]="stock()"
          [columns]="stockColumns"
          [showActions]="false"
          [clientSearch]="true"
          [searchPlaceholder]="'Producto, ubicacion, lote...'"
          [emptyTitle]="'Sin stock reportado'"
        />
        <app-data-table
          [rows]="movementRows()"
          [columns]="movementColumns"
          [showActions]="false"
          [clientSearch]="true"
          [searchPlaceholder]="'Numero, tipo, estado, referencia...'"
          [emptyTitle]="'Sin movimientos reportados'"
        />
      </div>
    </section>
  `,
  styles: [
    `.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1rem}.export-toolbar{display:flex;flex-wrap:wrap;gap:.6rem;justify-content:flex-end;align-items:center}.export-toolbar--secondary{padding-top:.25rem;border-top:1px solid rgba(41,50,65,.08);margin-top:.35rem}.reports-tables{display:grid;gap:1.25rem;min-width:0;max-width:100%;width:100%}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReportsPageComponent implements OnInit {
  private readonly api = inject(ReportApiService);
  private readonly auth = inject(AuthService);
  private readonly download = inject(DownloadService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canExportManagement = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'GERENTE']));
  protected readonly stock = signal<StockViewDto[]>([]);
  protected readonly movements = signal<MovementReportDto[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly movementRows = computed(() =>
    this.movements().map((m) => ({
      ...m,
      displayType: inventoryTransactionTypeEs(m.transactionType),
      displayStatus: inventoryTransactionStatusEs(m.status)
    }))
  );
  protected readonly stockColumns: DataColumn<StockViewDto>[] = [
    { key: 'productName', label: 'Producto' },
    { key: 'categoryName', label: 'Categoria' },
    { key: 'locationName', label: 'Ubicacion' },
    { key: 'quantityBase', label: 'Cantidad base' },
    { key: 'belowMinStock', label: 'Bajo minimo', type: 'boolean' },
    { key: 'totalValue', label: 'Valor', type: 'currency' }
  ];
  protected readonly movementColumns: DataColumn<MovementRow>[] = [
    { key: 'transactionNumber', label: 'Numero' },
    { key: 'displayType', label: 'Tipo', type: 'badge' },
    { key: 'productName', label: 'Producto' },
    { key: 'quantityBase', label: 'Cantidad base' },
    { key: 'displayStatus', label: 'Estado', type: 'badge' }
  ];
  protected readonly filters = this.fb.nonNullable.group({
    from: [''],
    to: [''],
    locationId: [0]
  });

  ngOnInit(): void {
    this.locationsApi.list().subscribe((locs) => this.locations.set(locs));
    this.load();
  }

  protected load(): void {
    const raw = this.filters.getRawValue();
    const locationId = raw.locationId || undefined;
    const from = raw.from || undefined;
    const to = raw.to || undefined;

    forkJoin({
      stock: this.api.getCurrentStock(locationId),
      movements: this.api.getMovements(from, to, undefined)
    }).subscribe(({ stock: stockData, movements: movData }) => {
      this.stock.set(stockData);
      this.movements.set(movData);
    });
  }

  protected exportStock(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/stock/export.xlsx',
      { locationId: raw.locationId || undefined },
      'stock-report.xlsx',
      'Se descargo el reporte de existencias.'
    );
  }

  protected exportMovements(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/movements/export.xlsx',
      { from: raw.from || undefined, to: raw.to || undefined },
      'movements-report.xlsx',
      'Se descargo el reporte de movimientos.'
    );
  }

  protected exportWaste(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/waste/export.xlsx',
      { from: raw.from || undefined, to: raw.to || undefined },
      'waste-report.xlsx',
      'Se descargo el reporte de mermas.'
    );
  }

  protected exportConsumption(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/consumption/export.xlsx',
      { from: raw.from || undefined, to: raw.to || undefined },
      'consumption-report.xlsx',
      'Se descargo el reporte de consumo.'
    );
  }

  /** Resumen de turnos en Excel (mismos filtros que el panel: fechas + ubicacion). */
  protected exportShiftXlsx(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/shifts/export.xlsx',
      {
        from: raw.from || undefined,
        to: raw.to || undefined,
        locationId: raw.locationId || undefined
      },
      'shift-summary.xlsx',
      'Se descargo el reporte de turnos (Excel).'
    );
  }

  /** Mismo dataset en CSV UTF-8 (con BOM) para herramientas externas. */
  protected exportShiftCsv(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/shifts/export',
      {
        from: raw.from || undefined,
        to: raw.to || undefined,
        locationId: raw.locationId || undefined
      },
      'shift-summary.csv',
      'Se descargo el reporte de turnos (CSV).'
    );
  }

  /** Solo descarga; la auditoria no se lista en pantalla. */
  protected exportAudit(): void {
    const raw = this.filters.getRawValue();
    this.safeBlobDownload(
      '/audit/export.xlsx',
      { from: raw.from || undefined, to: raw.to || undefined },
      'audit-history.xlsx',
      'Se descargo el historial de auditoria.'
    );
  }

  private safeBlobDownload(
    path: string,
    params: Record<string, string | number | undefined> | undefined,
    filename: string,
    detail: string
  ): void {
    this.api
      .download(path, params)
      .pipe(
        catchError(() => {
          this.feedback.error('Exportacion', 'No se pudo generar el archivo. Revisa fechas, ubicacion y permisos.');
          return EMPTY;
        })
      )
      .subscribe((response) => {
        const resolvedName = this.download.filenameFromDisposition(
          response.headers.get('content-disposition'),
          filename
        );
        this.download.save(
          response.body ?? new Blob(),
          resolvedName,
          response.headers.get('content-type')
        );
        this.feedback.success('Exportacion lista', detail);
      });
  }
}
