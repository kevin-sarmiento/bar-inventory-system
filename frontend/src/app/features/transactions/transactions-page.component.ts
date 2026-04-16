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
import { DataTableComponent } from '../../shared/ui/data-table.component';

type TransactionTypeOption = { value: string; label: string };
type TransactionStatusOption = { value: string; label: string };

@Component({
  selector: 'app-transactions-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 2</span>
          <h2 class="section-title">Transacciones de inventario</h2>
          <p class="section-subtitle">Consulta movimientos y cambia estado segun tu perfil.</p>
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
          <div class="field"><label>Fecha</label><input class="input" type="datetime-local" formControlName="transactionDate"></div>
          <div class="field">
            <label>Origen</label>
            <select class="select" formControlName="sourceLocationId">
              <option [ngValue]="null">Sin origen</option>
              <option *ngFor="let item of locations()" [ngValue]="item.id">{{ item.locationName }}</option>
            </select>
          </div>
          <div class="field">
            <label>Destino</label>
            <select class="select" formControlName="targetLocationId">
              <option [ngValue]="null">Sin destino</option>
              <option *ngFor="let item of locations()" [ngValue]="item.id">{{ item.locationName }}</option>
            </select>
          </div>
          <div class="field">
            <label>Proveedor</label>
            <select class="select" formControlName="supplierId">
              <option [ngValue]="null">Sin proveedor</option>
              <option *ngFor="let item of suppliers()" [ngValue]="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Estado inicial</label>
            <select class="select" formControlName="status">
              <option *ngFor="let item of statuses" [value]="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="field"><label>Creado por</label><input type="number" class="input" formControlName="createdBy"></div>
          <div class="field"><label>Referencia</label><input class="input" formControlName="referenceText"></div>
        </div>

        <div class="field"><label>Motivo</label><textarea rows="2" class="textarea" formControlName="reason"></textarea></div>

        <div formArrayName="items" class="items-grid">
          <article class="shell-card item-card" *ngFor="let group of items.controls; index as i" [formGroupName]="i">
            <div class="form-grid three-cols">
              <div class="field">
                <label>Producto</label>
                <select class="select" formControlName="productId">
                  <option *ngFor="let item of products()" [ngValue]="item.id">{{ item.name }}</option>
                </select>
              </div>
              <div class="field">
                <label>Unidad</label>
                <select class="select" formControlName="unitId">
                  <option *ngFor="let item of units()" [ngValue]="item.id">{{ item.name }}</option>
                </select>
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

      <p *ngIf="!canCreate()" class="section-subtitle">
        Tu perfil puede consultar movimientos. El cambio de estado depende de tu rol.
      </p>

      <app-data-table
        [rows]="rows()"
        [columns]="columns"
        [showActions]="canUpdateStatus()"
        [editLabel]="'Publicar'"
        [removeLabel]="'Cancelar'"
        [emptyTitle]="'Sin transacciones registradas'"
        [emptyDescription]="'Cuando existan movimientos apareceran aqui.'"
        (edit)="markPosted($event)"
        (remove)="markCancelled($event)"
      />

      <p *ngIf="canUpdateStatus()" class="section-subtitle">Editar publica la transaccion. Eliminar la marca como cancelada.</p>
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.items-grid{display:grid;gap:1rem}.item-card{padding:1rem;display:grid;gap:1rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`],
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
  protected readonly rows = signal<InventoryTransaction[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly suppliers = signal<Supplier[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly units = signal<Unit[]>([]);
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
  protected readonly columns: DataColumn<InventoryTransaction>[] = [
    { key: 'transactionNumber', label: 'Numero' },
    { key: 'transactionType', label: 'Tipo', type: 'badge' },
    { key: 'transactionDate', label: 'Fecha' },
    { key: 'status', label: 'Estado', type: 'badge' },
    { key: 'referenceText', label: 'Referencia' }
  ];
  protected readonly form = this.fb.group({
    transactionNumber: ['', Validators.required],
    transactionType: ['PURCHASE', Validators.required],
    transactionDate: ['', Validators.required],
    sourceLocationId: [null as number | null],
    targetLocationId: [null as number | null],
    supplierId: [null as number | null],
    referenceText: [''],
    reason: [''],
    status: ['POSTED'],
    createdBy: [1],
    items: this.fb.array([])
  });

  get items(): FormArray {
    return this.form.get('items') as FormArray;
  }

  ngOnInit(): void {
    if (this.canCreate()) {
      this.addItem();
    }
    this.load();
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
    const raw = this.form.getRawValue();
    const payload: CreateTransactionPayload = {
      ...raw,
      transactionDate: new Date(raw.transactionDate!).toISOString(),
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

  private load(): void {
    forkJoin([
      this.api.list(),
      this.locationsApi.list(),
      this.suppliersApi.list(),
      this.productsApi.list(),
      this.unitsApi.list()
    ]).subscribe(([rows, locations, suppliers, products, units]) => {
      this.rows.set(rows);
      this.locations.set(locations);
      this.suppliers.set(suppliers);
      this.products.set(products);
      this.units.set(units);
    });
  }

  private loadRows(): void {
    this.api.list().subscribe((rows) => this.rows.set(rows));
  }
}
