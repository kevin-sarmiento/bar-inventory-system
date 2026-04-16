import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DataColumn } from '../../core/models/api.models';
import { StockBalance } from '../../core/models/operations.models';
import { StockApiService } from '../../core/services/operations-api.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';

@Component({
  selector: 'app-stock-page',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header"><div><span class="chip">Fase 2</span><h2 class="section-title">Existencias actuales</h2><p class="section-subtitle">Consulta las existencias disponibles por producto y ubicacion.</p></div></header>
      <app-data-table [rows]="rows()" [columns]="columns" [showActions]="false" [emptyTitle]="'Sin existencias registradas'" />
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockPageComponent implements OnInit {
  private readonly api = inject(StockApiService);
  protected readonly rows = signal<StockBalance[]>([]);
  protected readonly columns: DataColumn<StockBalance>[] = [
    { key: 'productId', label: 'Producto ID' },
    { key: 'locationId', label: 'Ubicación ID' },
    { key: 'lotNumber', label: 'Lote' },
    { key: 'expirationDate', label: 'Vencimiento' },
    { key: 'quantityBase', label: 'Cantidad base' },
    { key: 'avgUnitCostBase', label: 'Costo base', type: 'currency' }
  ];
  ngOnInit(): void { this.api.list().subscribe((rows) => this.rows.set(rows)); }
}
