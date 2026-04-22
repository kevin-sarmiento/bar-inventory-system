import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Location, Product, Supplier, Unit } from '../../core/models/catalog.models';
import { CreateTransactionPayload, InventoryTransaction } from '../../core/models/operations.models';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, ProductApiService, SupplierApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { TransactionApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { inventoryTransactionStatusEs, inventoryTransactionTypeEs } from '../../shared/i18n/operations-labels';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { SearchSelectComponent, SearchSelectOption } from '../../shared/ui/search-select.component';

type TxRow = InventoryTransaction & { displayType: string; displayStatus: string };

type TransactionTypeOption = { value: string; label: string };
type TransactionStatusOption = { value: string; label: string };

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, DataTableComponent, SearchSelectComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 2</span>
          <h2 class="section-title">Transacciones de inventario</h2>
          <p class="section-subtitle">Movimientos y aprobacion segun rol.</p>
        </div>
      </header>

      <form *ngIf="canCreate()" class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field"><label>Numero</label><input class="input" formControlName="transactionNumber"></div>
          <div class="field">
            <label>Tipo</label>
            <select class="select" formControlName="transactionType">
              <option *ngFor="let type of types" [value]="type.value">{{ type.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>Fecha y hora</label>
            <input class="input input-readonly" type="text" readonly tabindex="-1" [value]="transactionDateLabel()" />
          </div>
          <div class="field">
            <label>Origen</label>
            <app-search-select
              formControlName="sourceLocationId"
              [options]="locationOptions()"
              [placeholder]="'Sin origen'"
              [searchPlaceholder]="'Buscar ubicacion...'"
              [allowClear]="true"
            />
          </div>
          <div class="field">
            <label>Destino</label>
            <app-search-select
              formControlName="targetLocationId"
              [options]="locationOptions()"
              [placeholder]="'Sin destino'"
              [searchPlaceholder]="'Buscar ubicacion...'"
              [allowClear]="true"
            />
          </div>
          <div class="field">
            <label>Proveedor</label>
            <app-search-select
              formControlName="supplierId"
              [options]="supplierOptions()"
              [placeholder]="'Sin proveedor'"
              [searchPlaceholder]="'Buscar proveedor...'"
              [allowClear]="true"
            />
          </div>
          <div class="field">
            <label>Estado inicial</label>
            <select class="select" formControlName="status">
              <option *ngFor="let item of statuses" [value]="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="field"><label>Referencia</label><input class="input" formControlName="referenceText"></div>
        </div>

        <div class="field"><label>Motivo</label><textarea rows="2" class="textarea" formControlName="reason"></textarea></div>

        <div formArrayName="items" class="items-grid">
          <article class="shell-card item-card" *ngFor="let group of items.controls; index as i" [formGroupName]="i">
            <div class="form-grid three-cols">
              <div class="field">
                <label>Producto</label>
                <app-search-select
                  formControlName="productId"
                  [options]="productOptions()"
                  [placeholder]="'Selecciona un producto'"
                  [searchPlaceholder]="'Buscar producto...'"
                />
              </div>
              <div class="field">
                <label>Unidad</label>
                <app-search-select
                  formControlName="unitId"
                  [options]="unitOptions()"
                  [placeholder]="'Selecciona una unidad'"
                  [searchPlaceholder]="'Buscar unidad...'"
                />
              </div>
              <div class="field"><label>Cantidad</label><input type="number" class="input" formControlName="quantity"></div>
              <div class="field"><label>Costo</label><input type="number" class="input" formControlName="unitCost"></div>
              <div class="field"><label>Lote</label><input class="input" formControlName="lotNumber"></div>
              <div class="field"><label>Vencimiento</label><input type="date" class="input" formControlName="expirationDate"></div>
            </div>
            <button class="btn btn-accent" type="button" (click)="removeItem(i)">Quitar item</button>
          </article>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="addItem()">Agregar item</button>
          <button class="btn btn-primary" type="submit">Crear transaccion</button>
        </div>
      </form>

      <div class="toolbar shell-card">
        <div class="field field-grow">
          <label for="txn-search">Buscar</label>
          <div class="search-input-wrap">
            <span class="search-input-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M10.5 4a6.5 6.5 0 1 0 4.03 11.6l4.44 4.44 1.06-1.06-4.44-4.44A6.5 6.5 0 0 0 10.5 4Zm0 1.5a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z"/>
              </svg>
            </span>
            <input
              id="txn-search"
              class="input search-input"
              type="search"
              placeholder="Numero, tipo, estado, referencia..."
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
            />
          </div>
        </div>
      </div>

      <app-data-table
        [rows]="filteredRows()"
        [columns]="columns"
        [showActions]="canUpdateStatus()"
        [editLabel]="'Publicar'"
        [removeLabel]="'Cancelar'"
        [emptyTitle]="'Sin transacciones registradas'"
        [emptyDescription]="''"
        (edit)="markPosted($event)"
        (remove)="markCancelled($event)"
      />
    </section>
  `,
  styles: [
    `.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.input-readonly{background:var(--color-surface-muted, rgba(41,50,65,.06));cursor:not-allowed}.items-grid{display:grid;gap:1rem}.item-card{padding:1rem;display:grid;gap:1rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}.toolbar{padding:1rem;display:flex;gap:1rem;align-items:flex-end}.field-grow{flex:1;min-width:12rem}.search-input-wrap{position:relative}.search-input{padding-left:2.8rem}.search-input-icon{position:absolute;left:.95rem;top:50%;width:1rem;height:1rem;color:var(--color-muted);transform:translateY(-50%);pointer-events:none;display:inline-flex;align-items:center;justify-content:center}.search-input-icon svg{width:100%;height:100%;fill:currentColor}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionsPageComponent implements OnInit {
  private readonly api = inject(TransactionApiService);
  private readonly auth = inject(AuthService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly suppliersApi = inject(SupplierApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canCreate = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'INVENTARIO']));
  protected readonly canUpdateStatus = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'GERENTE']));
  protected readonly rows = signal<TxRow[]>([]);
  /** Solo informativo en UI; el servidor asigna la fecha real al crear. */
  protected readonly transactionDateLabel = signal('');
  protected readonly searchQuery = signal('');
  protected readonly filteredRows = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.rows();
    if (!q) {
      return list;
    }
    return list.filter((r) => {
      const blob = [
        r.transactionNumber,
        r.referenceText,
        r.transactionType,
        r.displayType,
        r.status,
        r.displayStatus,
        r.reason
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  });
  protected readonly locations = signal<Location[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly locationOptions = computed<SearchSelectOption<number>[]>(() =>
    this.locations().map((location) => ({
      value: location.id,
      label: location.locationName,
      secondaryLabel: location.description ?? null
    }))
  );
  protected readonly supplierOptions = computed<SearchSelectOption<number>[]>(() =>
    this.suppliers().map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
      secondaryLabel: supplier.phone || supplier.email || null,
      keywords: [supplier.address, supplier.email, supplier.phone].filter(Boolean).join(' ')
    }))
  );
  protected readonly productOptions = computed<SearchSelectOption<number>[]>(() =>
    this.products().map((product) => ({
      value: product.id,
      label: product.name,
      secondaryLabel: product.sku ?? null,
      keywords: [product.barcode, product.notes].filter(Boolean).join(' ')
    }))
  );
  protected readonly unitOptions = computed<SearchSelectOption<number>[]>(() =>
    this.units().map((unit) => ({
      value: unit.id,
      label: unit.name,
      secondaryLabel: unit.code
    }))
  );
  protected readonly types: TransactionTypeOption[] = [
    { value: 'OPENING_STOCK', label: 'Stock inicial' },
    { value: 'PURCHASE', label: 'Compra' },
    { value: 'SALE', label: 'Venta' },
    { value: 'CONSUMPTION', label: 'Consumo' },
    { value: 'WASTE', label: 'Merma' },
    { value: 'ADJUSTMENT_IN', label: 'Ajuste de entrada' },
    { value: 'ADJUSTMENT_OUT', label: 'Ajuste de salida' },
    { value: 'TRANSFER', label: 'Transferencia' },
    { value: 'RETURN_TO_SUPPLIER', label: 'Devolucion a proveedor' },
    { value: 'RETURN_FROM_CUSTOMER', label: 'Devolucion de cliente' }
  ];
  protected readonly statuses: TransactionStatusOption[] = [
    { value: 'DRAFT', label: 'Borrador' },
    { value: 'POSTED', label: 'Publicado' },
    { value: 'CANCELLED', label: 'Cancelado' }
  ];
  protected readonly columns: DataColumn<TxRow>[] = [
    { key: 'transactionNumber', label: 'Numero' },
    { key: 'displayType', label: 'Tipo', type: 'badge' },
    { key: 'transactionDate', label: 'Fecha' },
    { key: 'displayStatus', label: 'Estado', type: 'badge' },
    { key: 'referenceText', label: 'Referencia' }
  ];
  protected readonly form = this.fb.group({
    transactionNumber: ['', Validators.required],
    transactionType: ['PURCHASE', Validators.required],
    sourceLocationId: [null as number | null],
    targetLocationId: [null as number | null],
    supplierId: [null as number | null],
    referenceText: [''],
    reason: [''],
    status: ['POSTED'],
    items: this.fb.array([])
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    if (this.canCreate()) {
      this.addItem();
      this.refreshTransactionDateLabel();
    }
    this.load();
  }

  private refreshTransactionDateLabel(): void {
    this.transactionDateLabel.set(
      new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())
    );
  }

  protected addItem(): void {
    this.items.push(
      this.fb.group({
        productId: [this.products()[0]?.id ?? 0, Validators.required],
        unitId: [this.units()[0]?.id ?? 0, Validators.required],
        quantity: [1, Validators.required],
        unitCost: [0],
        lotNumber: [''],
        expirationDate: [''],
        notes: ['']
      })
    );
  }

  protected removeItem(index: number): void {
    this.items.removeAt(index);
    if (!this.items.length) {
      this.addItem();
    }
  }

  protected save(): void {
    const uid = this.auth.userId();
    const raw = this.form.getRawValue();
    this.refreshTransactionDateLabel();
    const payload: CreateTransactionPayload = {
      ...raw,
      transactionDate: new Date().toISOString(),
      createdBy: uid ?? undefined,
      items: raw.items!.map((item: any) => ({
        ...item,
        expirationDate: item.expirationDate || null,
        lotNumber: item.lotNumber || null,
        notes: item.notes || null
      }))
    } as CreateTransactionPayload;

    this.api.create(payload).subscribe({
      next: () => {
        this.feedback.success('Transaccion creada', 'Movimiento guardado correctamente.');
        this.loadRows();
      }
    });
  }

  protected markPosted(row: InventoryTransaction): void {
    this.api.updateStatus(row.id, 'POSTED').subscribe({
      next: () => {
        this.feedback.success('Estado actualizado', 'La transaccion quedo publicada.');
        this.loadRows();
      }
    });
  }

  protected markCancelled(row: InventoryTransaction): void {
    this.api.updateStatus(row.id, 'CANCELLED').subscribe({
      next: () => {
        this.feedback.success('Estado actualizado', 'La transaccion quedo cancelada.');
        this.loadRows();
      }
    });
  }

  private toRows(raw: InventoryTransaction[]): TxRow[] {
    return raw.map((r) => ({
      ...r,
      displayType: inventoryTransactionTypeEs(r.transactionType),
      displayStatus: inventoryTransactionStatusEs(r.status)
    }));
  }

  private load(): void {
    forkJoin([
      this.api.list(),
      this.locationsApi.list(),
      this.suppliersApi.list(),
      this.productsApi.list(),
      this.unitsApi.list()
    ]).subscribe(([rows, locations, suppliers, products, units]) => {
      this.rows.set(this.toRows(rows));
      this.locations.set(locations);
      this.suppliers.set(suppliers);
      this.products.set(products);
      this.units.set(units);
    });
  }

  private loadRows(): void {
    this.api.list().subscribe((rows) => this.rows.set(this.toRows(rows)));
  }
}
