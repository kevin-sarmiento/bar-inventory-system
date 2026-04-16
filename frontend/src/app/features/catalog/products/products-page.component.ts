import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../../core/models/api.models';
import { Category, Product, ProductPayload, Unit } from '../../../core/models/catalog.models';
import { CategoryApiService, ProductApiService, UnitApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../../shared/ui/data-table.component';

@Component({
  selector: 'app-products-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor],
  template: `
    <section class="page-stack">
      <header class="page-header"><div><span class="chip">Fase 1</span><h2 class="section-title">Productos</h2><p class="section-subtitle">Productos físicos conectados a categorías y unidades reales.</p></div></header>
      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field"><label>SKU</label><input class="input" formControlName="sku"></div>
          <div class="field"><label>Nombre</label><input class="input" formControlName="name"></div>
          <div class="field"><label>Categoría</label><select class="select" formControlName="categoryId"><option *ngFor="let item of categories()" [ngValue]="item.id">{{ item.name }}</option></select></div>
          <div class="field"><label>Unidad base</label><select class="select" formControlName="baseUnitId"><option *ngFor="let item of units()" [ngValue]="item.id">{{ item.name }} ({{ item.code }})</option></select></div>
          <div class="field"><label>Stock mínimo base</label><input type="number" class="input" formControlName="minStockBaseQty"></div>
          <div class="field"><label>Codigo de barras</label><input class="input" formControlName="barcode"></div>
          <div class="field"><label>Activo</label><select class="select" formControlName="active"><option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option></select></div>
          <div class="field field-span"><label>Notas</label><textarea rows="3" class="textarea" formControlName="notes"></textarea></div>
        </div>
        <div class="actions"><button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button><button class="btn btn-primary" type="submit">{{ editing() ? 'Actualizar' : 'Crear' }}</button></div>
      </form>
      <app-data-table [rows]="rows()" [columns]="columns" (edit)="edit($event)" (remove)="remove($event)" />
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.field-span{grid-column:1/-1}.actions{display:flex;justify-content:flex-end;gap:.75rem}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsPageComponent implements OnInit {
  private readonly api = inject(ProductApiService);
  private readonly categoriesApi = inject(CategoryApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);
  protected readonly rows = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly editing = signal<Product | null>(null);
  protected readonly columns: DataColumn<Product>[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Nombre' },
    { key: 'categoryId', label: 'Categoría ID' },
    { key: 'baseUnitId', label: 'Unidad ID' },
    { key: 'minStockBaseQty', label: 'Minimo base' },
    { key: 'active', label: 'Estado', type: 'boolean' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    sku: [''],
    name: ['', Validators.required],
    categoryId: [0, Validators.required],
    baseUnitId: [0, Validators.required],
    minStockBaseQty: [0, Validators.required],
    barcode: [''],
    active: [true],
    notes: ['']
  });
  ngOnInit(): void { this.loadAll(); }
  protected save(): void {
    const raw = this.form.getRawValue();
    const payload: ProductPayload = { ...raw, sku: raw.sku || null, barcode: raw.barcode || null, notes: raw.notes || null };
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.subscribe({ next: () => { this.feedback.success('Producto guardado', 'Producto sincronizado con el backend.'); this.reset(); this.load(); }});
  }
  protected edit(row: Product): void { this.editing.set(row); this.form.reset({ sku: row.sku ?? '', name: row.name, categoryId: row.categoryId, baseUnitId: row.baseUnitId, minStockBaseQty: row.minStockBaseQty, barcode: row.barcode ?? '', active: row.active ?? true, notes: row.notes ?? '' }); }
  protected reset(): void { this.editing.set(null); this.form.reset({ sku: '', name: '', categoryId: this.categories()[0]?.id ?? 0, baseUnitId: this.units()[0]?.id ?? 0, minStockBaseQty: 0, barcode: '', active: true, notes: '' }); }
  protected remove(row: Product): void { if (!window.confirm(`¿Eliminar producto "${row.name}"?`)) return; this.api.remove(row.id).subscribe({ next: () => { this.feedback.success('Producto eliminado', 'Registro eliminado.'); this.load(); }}); }
  private loadAll(): void { forkJoin([this.api.list(), this.categoriesApi.list(), this.unitsApi.list()]).subscribe(([rows, categories, units]) => { this.rows.set(rows); this.categories.set(categories); this.units.set(units); if (!this.editing()) this.reset(); }); }
  private load(): void { this.api.list().subscribe((rows) => this.rows.set(rows)); }
}
