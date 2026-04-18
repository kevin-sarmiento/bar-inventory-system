import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../../core/models/api.models';
import { Category, Location, Product, ProductPayload, Unit } from '../../../core/models/catalog.models';
import { CategoryApiService, LocationApiService, ProductApiService, UnitApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../../shared/ui/data-table.component';

type ProductRow = Product & { ubicacion: string };

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor, NgIf],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 1</span>
          <h2 class="section-title">Productos</h2>
          <p class="section-subtitle">Catalogo con ubicacion por defecto.</p>
        </div>
      </header>
      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field"><label>SKU</label><input class="input" formControlName="sku"></div>
          <div class="field"><label>Nombre</label><input class="input" formControlName="name"></div>
          <div class="field">
            <label>Categoría</label>
            <select class="select" formControlName="categoryId">
              <option *ngFor="let item of categories()" [ngValue]="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div class="field">
            <label>Unidad base</label>
            <select class="select" formControlName="baseUnitId">
              <option *ngFor="let item of units()" [ngValue]="item.id">{{ item.name }} ({{ item.code }})</option>
            </select>
          </div>
          <div class="field">
            <label>Ubicacion por defecto</label>
            <select class="select" formControlName="defaultLocationId">
              <option [ngValue]="null">Sin asignar</option>
              <option *ngFor="let item of locations()" [ngValue]="item.id">{{ item.locationName }}</option>
            </select>
          </div>
          <div class="field"><label>Stock mínimo base</label><input type="number" class="input" formControlName="minStockBaseQty"></div>
          <div class="field"><label>Codigo de barras</label><input class="input" formControlName="barcode"></div>
          <div class="field">
            <label>Activo</label>
            <select class="select" formControlName="active">
              <option [ngValue]="true">Activo</option>
              <option [ngValue]="false">Inactivo</option>
            </select>
          </div>
          <div class="field field-span"><label>Notas</label><textarea rows="3" class="textarea" formControlName="notes"></textarea></div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button>
          <button class="btn btn-primary" type="submit">{{ editing() ? 'Actualizar' : 'Crear' }}</button>
        </div>
      </form>
      <div class="toolbar shell-card" *ngIf="displayRows().length">
        <div class="field field-grow">
          <label for="prod-search">Buscar producto</label>
          <input
            id="prod-search"
            class="input"
            type="search"
            placeholder="Nombre, SKU, ubicacion..."
            [value]="searchQuery()"
            (input)="searchQuery.set($any($event.target).value)"
          />
        </div>
      </div>
      <app-data-table [rows]="filteredDisplayRows()" [columns]="columns" (edit)="edit($event)" (remove)="remove($event)" />
    </section>
  `,
  styles: [
    `.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.field-span{grid-column:1/-1}.actions{display:flex;justify-content:flex-end;gap:.75rem}.toolbar{padding:1rem;display:flex;gap:1rem;align-items:flex-end}.field-grow{flex:1;min-width:12rem}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsPageComponent implements OnInit {
  private readonly api = inject(ProductApiService);
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);
  protected readonly rows = signal<Product[]>([]);
  protected readonly displayRows = signal<ProductRow[]>([]);
  protected readonly searchQuery = signal('');
  protected readonly categories = signal<Category[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly editing = signal<Product | null>(null);
  protected readonly columns: DataColumn<ProductRow>[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Nombre' },
    { key: 'categoryId', label: 'Categoría ID' },
    { key: 'ubicacion', label: 'Ubicacion' },
    { key: 'minStockBaseQty', label: 'Minimo base' },
    { key: 'active', label: 'Estado', type: 'boolean' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    sku: [''],
    name: ['', Validators.required],
    categoryId: [0, Validators.required],
    baseUnitId: [0, Validators.required],
    defaultLocationId: [null as number | null],
    minStockBaseQty: [0, Validators.required],
    barcode: [''],
    active: [true],
    notes: ['']
  });

  ngOnInit(): void {
    this.loadAll();
  }

  protected filteredDisplayRows(): ProductRow[] {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.displayRows();
    if (!q) {
      return list;
    }
    return list.filter((r) => {
      const blob = [r.sku, r.name, r.ubicacion, String(r.categoryId)].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(q);
    });
  }

  protected save(): void {
    const raw = this.form.getRawValue();
    const payload: ProductPayload = {
      ...raw,
      sku: raw.sku || null,
      barcode: raw.barcode || null,
      notes: raw.notes || null,
      defaultLocationId: raw.defaultLocationId ?? null
    };
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.subscribe({
      next: () => {
        this.feedback.success('Producto guardado', 'Producto sincronizado con el backend.');
        this.reset();
        this.load();
      }
    });
  }

  protected edit(row: Product): void {
    this.editing.set(row);
    this.form.reset({
      sku: row.sku ?? '',
      name: row.name,
      categoryId: row.categoryId,
      baseUnitId: row.baseUnitId,
      defaultLocationId: row.defaultLocationId ?? null,
      minStockBaseQty: row.minStockBaseQty,
      barcode: row.barcode ?? '',
      active: row.active ?? true,
      notes: row.notes ?? ''
    });
  }

  protected reset(): void {
    this.editing.set(null);
    this.form.reset({
      sku: '',
      name: '',
      categoryId: this.categories()[0]?.id ?? 0,
      baseUnitId: this.units()[0]?.id ?? 0,
      defaultLocationId: null,
      minStockBaseQty: 0,
      barcode: '',
      active: true,
      notes: ''
    });
  }

  protected remove(row: Product): void {
    if (!window.confirm(`¿Eliminar producto "${row.name}"?`)) {
      return;
    }
    this.api.remove(row.id).subscribe({
      next: () => {
        this.feedback.success('Producto eliminado', 'Registro eliminado.');
        this.load();
      }
    });
  }

  private refreshDisplayRows(products: Product[], locs: Location[]): void {
    const lmap = new Map(locs.map((l) => [l.id, l.locationName]));
    this.displayRows.set(
      products.map((p) => ({
        ...p,
        ubicacion: p.defaultLocationId != null ? lmap.get(p.defaultLocationId) ?? `#${p.defaultLocationId}` : '—'
      }))
    );
  }

  private loadAll(): void {
    forkJoin([this.api.list(), this.categoriesApi.list(), this.unitsApi.list(), this.locationsApi.list()]).subscribe(
      ([rows, categories, units, locations]) => {
        this.rows.set(rows);
        this.categories.set(categories);
        this.units.set(units);
        this.locations.set(locations);
        this.refreshDisplayRows(rows, locations);
        if (!this.editing()) {
          this.reset();
        }
      }
    );
  }

  private load(): void {
    forkJoin([this.api.list(), this.locationsApi.list()]).subscribe(([rows, locations]) => {
      this.rows.set(rows);
      this.locations.set(locations);
      this.refreshDisplayRows(rows, locations);
    });
  }
}
