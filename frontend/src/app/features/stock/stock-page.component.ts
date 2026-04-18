import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DataColumn } from '../../core/models/api.models';
import { Location, Product } from '../../core/models/catalog.models';
import { StockBalance } from '../../core/models/operations.models';
import { LocationApiService, ProductApiService } from '../../core/services/catalog-api.service';
import { StockApiService } from '../../core/services/operations-api.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { forkJoin } from 'rxjs';

type StockRow = StockBalance & { productName: string; locationName: string };

@Component({
  selector: 'app-stock-page',
  standalone: true,
  imports: [DataTableComponent, NgIf],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 2</span>
          <h2 class="section-title">Existencias actuales</h2>
          <p class="section-subtitle">Saldo por producto y ubicacion.</p>
        </div>
      </header>
      <div class="toolbar shell-card">
        <div class="field field-grow">
          <label for="stock-search">Buscar</label>
          <input
            id="stock-search"
            class="input"
            type="search"
            placeholder="Producto, ubicacion, lote..."
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
          />
        </div>
      </div>
      <app-data-table
        [rows]="filteredRows()"
        [columns]="columns"
        [showActions]="false"
        [emptyTitle]="'Sin existencias registradas'"
      />
    </section>
  `,
  styles: [
    `.toolbar{padding:1rem;display:flex;gap:1rem;align-items:flex-end}.field-grow{flex:1;min-width:12rem}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockPageComponent implements OnInit {
  private readonly api = inject(StockApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly locationsApi = inject(LocationApiService);
  protected readonly rows = signal<StockRow[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.rows();
    if (!q) {
      return list;
    }
    return list.filter((r) => {
      const blob = [r.productName, r.locationName, r.lotNumber, String(r.productId), String(r.locationId)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  });
  protected readonly columns: DataColumn<StockRow>[] = [
    { key: 'productName', label: 'Producto' },
    { key: 'locationName', label: 'Ubicacion' },
    { key: 'lotNumber', label: 'Lote' },
    { key: 'expirationDate', label: 'Vencimiento' },
    { key: 'quantityBase', label: 'Cantidad base' },
    { key: 'avgUnitCostBase', label: 'Costo base', type: 'currency' }
  ];

  ngOnInit(): void {
    forkJoin([this.api.list(), this.productsApi.list(), this.locationsApi.list()]).subscribe(([balances, products, locations]) => {
      const pmap = new Map(products.map((p: Product) => [p.id, p.name]));
      const lmap = new Map(locations.map((l: Location) => [l.id, l.locationName]));
      this.rows.set(
        balances.map((b) => ({
          ...b,
          productName: pmap.get(b.productId) ?? `#${b.productId}`,
          locationName: lmap.get(b.locationId) ?? `#${b.locationId}`
        }))
      );
    });
  }
}
