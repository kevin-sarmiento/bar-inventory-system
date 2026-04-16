import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Location, MenuItem, Product, Unit } from '../../core/models/catalog.models';
import { CreateSalePayload, Sale } from '../../core/models/operations.models';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, MenuApiService, ProductApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { SalesApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';

type SaleStatusOption = { value: string; label: string };

@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 3</span>
          <h2 class="section-title">Ventas</h2>
          <p class="section-subtitle">Registra ventas y procesa inventario segun tu rol.</p>
        </div>
      </header>

      <form *ngIf="canCreate()" class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field"><label>Numero de venta</label><input class="input" formControlName="saleNumber"></div>
          <div class="field"><label>Fecha</label><input type="datetime-local" class="input" formControlName="saleDatetime"></div>
          <div class="field">
            <label>Ubicacion</label>
            <select class="select" formControlName="locationId">
              <option *ngFor="let item of locations()" [ngValue]="item.id">{{ item.locationName }}</option>
            </select>
          </div>
          <div class="field"><label>Usuario de caja</label><input type="number" class="input" formControlName="cashierUserId"></div>
          <div class="field"><label>ID del turno</label><input type="number" class="input" formControlName="shiftId"></div>
          <div class="field">
            <label>Estado</label>
            <select class="select" formControlName="status">
              <option *ngFor="let item of statuses" [value]="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="field"><label>Total</label><input type="number" class="input" formControlName="totalAmount"></div>
          <div class="field">
            <label>Procesar inventario</label>
            <select class="select" formControlName="processInventory">
              <option [ngValue]="true">Si</option>
              <option [ngValue]="false">No</option>
            </select>
          </div>
        </div>

        <div formArrayName="items" class="items-grid">
          <article class="shell-card item-card" *ngFor="let group of items.controls; index as i" [formGroupName]="i">
            <div class="form-grid four-cols">
              <div class="field">
                <label>ID del menu</label>
                <select class="select" formControlName="menuItemId">
                  <option [ngValue]="null">Sin menu</option>
                  <option *ngFor="let item of menuItems()" [ngValue]="item.id">{{ item.menuName }}</option>
                </select>
              </div>
              <div class="field">
                <label>ID del producto</label>
                <select class="select" formControlName="productId">
                  <option [ngValue]="null">Sin producto</option>
                  <option *ngFor="let item of products()" [ngValue]="item.id">{{ item.name }}</option>
                </select>
              </div>
              <div class="field">
                <label>ID de la unidad</label>
                <select class="select" formControlName="unitId">
                  <option [ngValue]="null">Sin unidad</option>
                  <option *ngFor="let item of units()" [ngValue]="item.id">{{ item.name }}</option>
                </select>
              </div>
              <div class="field"><label>Cantidad</label><input type="number" class="input" formControlName="quantity"></div>
              <div class="field"><label>Precio unitario</label><input type="number" class="input" formControlName="unitPrice"></div>
            </div>
            <button class="btn btn-accent" type="button" (click)="removeItem(i)">Quitar item</button>
          </article>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="addItem()">Agregar item</button>
          <button class="btn btn-primary" type="submit">Crear venta</button>
        </div>
      </form>

      <p *ngIf="!canCreate()" class="section-subtitle">
        Tu perfil puede consultar ventas. El procesamiento de inventario depende de los permisos operativos.
      </p>

      <app-data-table
        [rows]="rows()"
        [columns]="columns"
        [showActions]="canPostInventory()"
        [editLabel]="'Procesar'"
        [hideRemoveAction]="true"
        [emptyTitle]="'Sin ventas registradas'"
        [emptyDescription]="'Cuando existan ventas apareceran aqui.'"
        (edit)="postInventory($event)"
        (remove)="noop($event)"
      />

      <p *ngIf="canPostInventory()" class="section-subtitle">Editar envia la venta a inventario. Eliminar no se usa en esta pantalla.</p>
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.four-cols{grid-template-columns:repeat(4,minmax(0,1fr))}.items-grid{display:grid;gap:1rem}.item-card{padding:1rem;display:grid;gap:1rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}@media (max-width:900px){.three-cols,.four-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesPageComponent implements OnInit {
  private readonly api = inject(SalesApiService);
  private readonly auth = inject(AuthService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly menuApi = inject(MenuApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canCreate = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'CAJERO', 'BARTENDER']));
  protected readonly canPostInventory = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'INVENTARIO']));
  protected readonly rows = signal<Sale[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly menuItems = signal<MenuItem[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly statuses: SaleStatusOption[] = [
    { value: 'PAID', label: 'Pagada' },
    { value: 'OPEN', label: 'Abierta' },
    { value: 'CANCELLED', label: 'Cancelada' }
  ];
  protected readonly columns: DataColumn<Sale>[] = [
    { key: 'saleNumber', label: 'Numero' },
    { key: 'saleDatetime', label: 'Fecha' },
    { key: 'locationId', label: 'Ubicacion' },
    { key: 'totalAmount', label: 'Total', type: 'currency' },
    { key: 'status', label: 'Estado', type: 'badge' },
    { key: 'inventoryProcessed', label: 'Inventario procesado', type: 'boolean' }
  ];
  protected readonly form = this.fb.group({
    saleNumber: ['', Validators.required],
    saleDatetime: ['', Validators.required],
    locationId: [0, Validators.required],
    cashierUserId: [1, Validators.required],
    shiftId: [null as number | null],
    totalAmount: [0, Validators.required],
    status: ['PAID'],
    processInventory: [false],
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
        menuItemId: [null as number | null],
        productId: [null as number | null],
        unitId: [null as number | null],
        quantity: [1, Validators.required],
        unitPrice: [0, Validators.required]
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
    const payload: CreateSalePayload = {
      ...raw,
      saleDatetime: new Date(raw.saleDatetime!).toISOString(),
      items: raw.items as any
    } as CreateSalePayload;

    this.api.create(payload).subscribe({
      next: () => {
        this.feedback.success('Venta creada', 'La venta fue registrada correctamente.');
        this.loadRows();
      }
    });
  }

  protected postInventory(row: Sale): void {
    this.api.postInventory(row.id, row.cashierUserId).subscribe({
      next: () => {
        this.feedback.success('Inventario procesado', 'La venta fue enviada a inventario.');
        this.loadRows();
      }
    });
  }

  protected noop(_: unknown): void {}

  private load(): void {
    forkJoin([
      this.api.list(),
      this.locationsApi.list(),
      this.menuApi.list(),
      this.productsApi.list(),
      this.unitsApi.list()
    ]).subscribe(([rows, locations, menuItems, products, units]) => {
      this.rows.set(rows);
      this.locations.set(locations);
      this.menuItems.set(menuItems);
      this.products.set(products);
      this.units.set(units);
    });
  }

  private loadRows(): void {
    this.api.list().subscribe((rows) => this.rows.set(rows));
  }
}
