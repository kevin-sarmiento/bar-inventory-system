import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Location, MenuItem, Product, Unit } from '../../core/models/catalog.models';
import { CreateSalePayload, Sale, ShiftDto } from '../../core/models/operations.models';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, MenuApiService, ProductApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { SalesApiService, ShiftApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { saleStatusEs, shiftStatusEs } from '../../shared/i18n/operations-labels';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { SearchSelectComponent, SearchSelectOption } from '../../shared/ui/search-select.component';

type SaleStatusOption = { value: string; label: string };

type SaleRow = Sale & {
  displayStatus: string;
  ubicacion: string;
  cajero: string;
  registradoPor: string;
};

@Component({
  selector: 'app-sales-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, DataTableComponent, SearchSelectComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 3</span>
          <h2 class="section-title">Ventas</h2>
          <p class="section-subtitle">Registro y procesamiento de inventario.</p>
        </div>
      </header>

      <form *ngIf="canCreate()" class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field">
            <label>Ubicacion</label>
            <app-search-select
              formControlName="locationId"
              [options]="locationOptions()"
              [placeholder]="'Selecciona una ubicacion'"
              [searchPlaceholder]="'Buscar ubicacion...'"
            />
          </div>
          <div class="field">
            <label>Turno (opcional)</label>
            <app-search-select
              formControlName="shiftId"
              [options]="shiftOptions()"
              [placeholder]="'Sin turno'"
              [searchPlaceholder]="'Buscar turno...'"
              [allowClear]="true"
            />
          </div>
          <div class="field">
            <label>Estado</label>
            <select class="select" formControlName="status">
              <option *ngFor="let item of statuses" [value]="item.value">{{ item.label }}</option>
            </select>
          </div>
          <div class="field">
            <label>Procesar inventario al crear</label>
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
                <label>Carta / menu</label>
                <app-search-select
                  formControlName="menuItemId"
                  [options]="menuItemOptions()"
                  [placeholder]="'Sin menu'"
                  [searchPlaceholder]="'Buscar item de menu...'"
                  [allowClear]="true"
                />
              </div>
              <div class="field">
                <label>Producto directo</label>
                <app-search-select
                  formControlName="productId"
                  [options]="productOptions()"
                  [placeholder]="'Sin producto'"
                  [searchPlaceholder]="'Buscar producto...'"
                  [allowClear]="true"
                />
              </div>
              <div class="field">
                <label>Unidad</label>
                <app-search-select
                  formControlName="unitId"
                  [options]="unitOptions()"
                  [placeholder]="'Sin unidad'"
                  [searchPlaceholder]="'Buscar unidad...'"
                  [allowClear]="true"
                />
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

      <h3 class="subsection-title">Ventas pendientes y otras</h3>
      <app-data-table
        [rows]="openRows()"
        [columns]="columns"
        [showActions]="canPostInventory()"
        [editLabel]="'Procesar'"
        [hideRemoveAction]="true"
        [clientSearch]="true"
        [searchPlaceholder]="'Numero, estado, ubicacion, cajero...'"
        [emptyTitle]="'Sin ventas en esta lista'"
        [emptyDescription]="''"
        (edit)="postInventory($event)"
      />

      <h3 class="subsection-title">Ventas pagadas</h3>
      <app-data-table
        [rows]="paidRows()"
        [columns]="columns"
        [showActions]="canPostInventory()"
        [editLabel]="'Procesar'"
        [hideRemoveAction]="true"
        [clientSearch]="true"
        [searchPlaceholder]="'Numero, estado, ubicacion, cajero...'"
        [emptyTitle]="'Sin ventas pagadas'"
        [emptyDescription]="''"
        (edit)="postInventory($event)"
      />
    </section>
  `,
  styles: [
    `.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.four-cols{grid-template-columns:repeat(4,minmax(0,1fr))}.items-grid{display:grid;gap:1rem}.item-card{padding:1rem;display:grid;gap:1rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}.subsection-title{margin:1.25rem 0 0.5rem;font-family:'Sora',sans-serif;font-size:1.05rem}@media (max-width:900px){.three-cols,.four-cols{grid-template-columns:1fr}}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SalesPageComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly api = inject(SalesApiService);
  private readonly shiftApi = inject(ShiftApiService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly menuApi = inject(MenuApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canCreate = computed(() =>
    this.auth.hasAnyRole(['ADMINISTRADOR', 'CAJERO', 'BARTENDER', 'GERENTE'])
  );
  protected readonly canPostInventory = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'INVENTARIO', 'GERENTE']));
  protected readonly rows = signal<SaleRow[]>([]);
  protected readonly shiftsForSale = signal<ShiftDto[]>([]);
  protected readonly openRows = computed(() => this.rows().filter((r) => r.status !== 'PAID'));
  protected readonly paidRows = computed(() => this.rows().filter((r) => r.status === 'PAID'));
  protected readonly locations = signal<Location[]>([]);
  protected readonly menuItems = signal<MenuItem[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly locationOptions = computed<SearchSelectOption<number>[]>(() =>
    this.locations().map((location) => ({
      value: location.id,
      label: location.locationName,
      secondaryLabel: location.description ?? null
    }))
  );
  protected readonly shiftOptions = computed<SearchSelectOption<number>[]>(() =>
    this.shiftsForSale().map((shift) => ({
      value: shift.id,
      label: this.shiftLabel(shift),
      secondaryLabel: shift.notes ?? null,
      keywords: [shift.username, shift.fullName, shift.locationName].filter(Boolean).join(' ')
    }))
  );
  protected readonly menuItemOptions = computed<SearchSelectOption<number>[]>(() =>
    this.menuItems().map((item) => ({
      value: item.id,
      label: item.menuName,
      secondaryLabel: `$${item.salePrice}`
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
  protected readonly statuses: SaleStatusOption[] = [
    { value: 'OPEN', label: 'Abierta' },
    { value: 'PAID', label: 'Pagada' },
    { value: 'CANCELLED', label: 'Cancelada' }
  ];
  protected readonly columns: DataColumn<SaleRow>[] = [
    { key: 'saleNumber', label: 'Numero' },
    { key: 'saleDatetime', label: 'Fecha' },
    { key: 'ubicacion', label: 'Ubicacion' },
    { key: 'cajero', label: 'Cajero' },
    { key: 'registradoPor', label: 'Registro' },
    { key: 'totalAmount', label: 'Total', type: 'currency' },
    { key: 'displayStatus', label: 'Estado', type: 'badge' },
    { key: 'inventoryProcessed', label: 'Inventario procesado', type: 'boolean' }
  ];
  protected readonly form = this.fb.group({
    locationId: [0, Validators.required],
    shiftId: [null as number | null],
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
      this.form.get('locationId')!.valueChanges.subscribe((lid) => {
        this.form.patchValue({ shiftId: null }, { emitEvent: false });
        this.loadShiftsForLocation(lid);
      });
    }
    this.load();
  }

  protected shiftLabel(sh: ShiftDto): string {
    const inicio = sh.scheduledStart.replace('T', ' ').slice(0, 16);
    const persona = sh.fullName || sh.username || '';
    const quien = persona ? `${persona} · ` : '';
    return `#${sh.id} · ${quien}${inicio} · ${shiftStatusEs(sh.status)}`;
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
    const uid = this.auth.userId();
    if (uid == null) {
      this.feedback.error('Sesion', 'No se pudo determinar el usuario. Vuelve a iniciar sesion.');
      return;
    }
    const raw = this.form.getRawValue();
    const items = raw.items as {
      menuItemId: number | null;
      productId: number | null;
      unitId: number | null;
      quantity: number;
      unitPrice: number;
    }[];
    const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const shiftId = raw.shiftId != null && raw.shiftId > 0 ? raw.shiftId : null;
    let cashierUserId = uid;
    if (shiftId != null) {
      const sh = this.shiftsForSale().find((s) => s.id === shiftId);
      if (sh) {
        cashierUserId = sh.userId;
      }
    }
    const payload: CreateSalePayload = {
      locationId: raw.locationId!,
      cashierUserId,
      shiftId,
      totalAmount,
      status: raw.status ?? 'PAID',
      processInventory: !!raw.processInventory,
      items
    };

    this.api.create(payload).subscribe({
      next: () => {
        this.feedback.success('Venta creada', 'La venta fue registrada correctamente.');
        this.loadRows();
      }
    });
  }

  protected postInventory(row: Sale): void {
    if (row.status !== 'PAID') {
      this.feedback.error('Inventario', 'Solo las ventas pagadas pueden procesarse.');
      return;
    }
    if (row.inventoryProcessed) {
      this.feedback.error('Inventario', 'Esta venta ya fue procesada.');
      return;
    }
    this.api.postInventory(row.id).subscribe({
      next: () => {
        this.feedback.success('Inventario procesado', 'La venta fue enviada a inventario.');
        this.loadRows();
      }
    });
  }

  private loadShiftsForLocation(locationId: number | null | undefined): void {
    if (!locationId || !this.canCreate()) {
      this.shiftsForSale.set([]);
      return;
    }
    this.shiftApi.forSale(locationId).subscribe({
      next: (list) => this.shiftsForSale.set(list),
      error: () => this.shiftsForSale.set([])
    });
  }

  private toRows(raw: Sale[]): SaleRow[] {
    return raw.map((r) => ({
      ...r,
      displayStatus: saleStatusEs(r.status),
      ubicacion: r.locationName ?? `#${r.locationId}`,
      cajero: r.cashierFullName || r.cashierUsername || `#${r.cashierUserId}`,
      registradoPor:
        r.createdByFullName || r.createdByUsername || (r.createdBy != null ? `#${r.createdBy}` : '—')
    }));
  }

  private load(): void {
    forkJoin([
      this.api.list(),
      this.locationsApi.list(),
      this.menuApi.list(),
      this.productsApi.list(),
      this.unitsApi.list()
    ]).subscribe(([rows, locations, menuItems, products, units]) => {
      this.rows.set(this.toRows(rows));
      this.locations.set(locations);
      this.menuItems.set(menuItems);
      this.products.set(products);
      this.units.set(units);
      const lid = this.form.getRawValue().locationId;
      if (lid && this.canCreate()) {
        this.loadShiftsForLocation(lid);
      }
    });
  }

  private loadRows(): void {
    this.api.list().subscribe((rows) => {
      this.rows.set(this.toRows(rows));
      const lid = this.form.getRawValue().locationId;
      if (lid && this.canCreate()) {
        this.loadShiftsForLocation(lid);
      }
    });
  }
}
