import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Location, Product } from '../../core/models/catalog.models';
import { CreatePhysicalCountPayload, PhysicalCount } from '../../core/models/operations.models';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, ProductApiService } from '../../core/services/catalog-api.service';
import { PhysicalCountApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';

@Component({
  selector: 'app-physical-counts-page',
  standalone: true,
  imports: [ReactiveFormsModule, NgFor, NgIf, DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 3</span>
          <h2 class="section-title">Conteos fisicos</h2>
          <p class="section-subtitle">Registra conteos y cierra operaciones segun tu perfil.</p>
        </div>
      </header>

      <form *ngIf="canCreate()" class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid four-cols">
          <div class="field"><label>Numero de conteo</label><input class="input" formControlName="countNumber"></div>
          <div class="field">
            <label>Ubicacion</label>
            <select class="select" formControlName="locationId">
              <option *ngFor="let item of locations()" [ngValue]="item.id">{{ item.locationName }}</option>
            </select>
          </div>
          <div class="field"><label>Fecha</label><input type="datetime-local" class="input" formControlName="countDate"></div>
          <div class="field"><label>Creado por</label><input type="number" class="input" formControlName="createdBy"></div>
        </div>

        <div class="field"><label>Notas</label><textarea class="textarea" rows="2" formControlName="notes"></textarea></div>

        <div formArrayName="items" class="items-grid">
          <article class="shell-card item-card" *ngFor="let group of items.controls; index as i" [formGroupName]="i">
            <div class="form-grid four-cols">
              <div class="field">
                <label>Producto</label>
                <select class="select" formControlName="productId">
                  <option *ngFor="let item of products()" [ngValue]="item.id">{{ item.name }}</option>
                </select>
              </div>
              <div class="field"><label>Teorico base</label><input type="number" class="input" formControlName="theoreticalQtyBase"></div>
              <div class="field"><label>Real base</label><input type="number" class="input" formControlName="actualQtyBase"></div>
              <div class="field"><label>Notas</label><input class="input" formControlName="notes"></div>
            </div>
            <button class="btn btn-accent" type="button" (click)="removeItem(i)">Quitar item</button>
          </article>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="addItem()">Agregar item</button>
          <button class="btn btn-primary" type="submit">Crear conteo</button>
        </div>
      </form>

      <p *ngIf="!canCreate()" class="section-subtitle">
        Tu perfil puede consultar conteos. El cierre queda disponible solo para los roles autorizados.
      </p>

      <app-data-table
        [rows]="rows()"
        [columns]="columns"
        [showActions]="canClose()"
        [editLabel]="'Cerrar'"
        [hideRemoveAction]="true"
        [emptyTitle]="'Sin conteos registrados'"
        [emptyDescription]="'Cuando existan conteos apareceran aqui.'"
        (edit)="close($event)"
        (remove)="noop($event)"
      />

      <p *ngIf="canClose()" class="section-subtitle">Editar cierra el conteo. Eliminar no se usa en esta pantalla.</p>
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.four-cols{grid-template-columns:repeat(4,minmax(0,1fr))}.items-grid{display:grid;gap:1rem}.item-card{padding:1rem;display:grid;gap:1rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}@media (max-width:900px){.four-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PhysicalCountsPageComponent implements OnInit {
  private readonly api = inject(PhysicalCountApiService);
  private readonly auth = inject(AuthService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canCreate = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'INVENTARIO']));
  protected readonly canClose = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'GERENTE']));
  protected readonly rows = signal<PhysicalCount[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly columns: DataColumn<PhysicalCount>[] = [
    { key: 'countNumber', label: 'Conteo' },
    { key: 'locationId', label: 'Ubicacion' },
    { key: 'countDate', label: 'Fecha' },
    { key: 'status', label: 'Estado', type: 'badge' },
    { key: 'createdBy', label: 'Creado por' }
  ];
  protected readonly form = this.fb.group({
    countNumber: ['', Validators.required],
    locationId: [0, Validators.required],
    countDate: ['', Validators.required],
    notes: [''],
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
        theoreticalQtyBase: [0, Validators.required],
        actualQtyBase: [0, Validators.required],
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
    const payload: CreatePhysicalCountPayload = {
      ...raw,
      countDate: new Date(raw.countDate!).toISOString(),
      items: raw.items as any
    } as CreatePhysicalCountPayload;

    this.api.create(payload).subscribe({
      next: () => {
        this.feedback.success('Conteo creado', 'El conteo fue registrado correctamente.');
        this.loadRows();
      }
    });
  }

  protected close(row: PhysicalCount): void {
    this.api.closeCount(row.id, row.createdBy ?? 1).subscribe({
      next: () => {
        this.feedback.success('Conteo cerrado', 'El conteo fue cerrado correctamente.');
        this.loadRows();
      }
    });
  }

  protected noop(_: unknown): void {}

  private load(): void {
    forkJoin([this.api.list(), this.locationsApi.list(), this.productsApi.list()]).subscribe(([rows, locations, products]) => {
      this.rows.set(rows);
      this.locations.set(locations);
      this.products.set(products);
    });
  }

  private loadRows(): void {
    this.api.list().subscribe((rows) => this.rows.set(rows));
  }
}
