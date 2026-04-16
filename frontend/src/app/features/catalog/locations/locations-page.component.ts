import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataColumn } from '../../../core/models/api.models';
import { Location, LocationPayload } from '../../../core/models/catalog.models';
import { LocationApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../../shared/ui/data-table.component';

type LocationRow = Location & { locationTypeLabel: string };

@Component({
  selector: 'app-locations-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header"><div><span class="chip">Fase 1</span><h2 class="section-title">Ubicaciones</h2><p class="section-subtitle">Sedes, barras, cocina, nevera y auxiliares.</p></div></header>
      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid two-cols">
          <div class="field"><label>Nombre</label><input class="input" formControlName="locationName"></div>
          <div class="field">
            <label>Tipo</label>
            <select class="select" formControlName="locationType">
              <option value="WAREHOUSE">Bodega</option>
              <option value="BAR">Barra</option>
              <option value="KITCHEN">Cocina</option>
              <option value="FRIDGE">Nevera</option>
              <option value="AUXILIARY">Auxiliar</option>
            </select>
          </div>
          <div class="field"><label>Descripcion</label><input class="input" formControlName="description"></div>
          <div class="field"><label>Estado</label><select class="select" formControlName="active"><option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option></select></div>
        </div>
        <div class="actions"><button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button><button class="btn btn-primary" type="submit">{{ editing() ? 'Actualizar' : 'Crear' }}</button></div>
      </form>
      <app-data-table [rows]="rows()" [columns]="columns" (edit)="edit($event)" (remove)="remove($event)" />
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.two-cols{grid-template-columns:repeat(2,minmax(0,1fr))}.actions{display:flex;justify-content:flex-end;gap:.75rem}@media (max-width:900px){.two-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LocationsPageComponent implements OnInit {
  private readonly api = inject(LocationApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly rows = signal<LocationRow[]>([]);
  protected readonly editing = signal<Location | null>(null);
  protected readonly columns: DataColumn<LocationRow>[] = [
    { key: 'locationName', label: 'Nombre' },
    { key: 'locationTypeLabel', label: 'Tipo', type: 'badge' },
    { key: 'description', label: 'Descripcion' },
    { key: 'active', label: 'Estado', type: 'boolean' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    locationName: ['', Validators.required],
    locationType: ['WAREHOUSE' as Location['locationType'], Validators.required],
    description: [''],
    active: [true]
  });

  ngOnInit(): void {
    this.load();
  }

  protected save(): void {
    const raw = this.form.getRawValue();
    const payload: LocationPayload = { ...raw, description: raw.description || null };
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.subscribe({
      next: () => {
        this.feedback.success('Ubicacion guardada', 'La ubicacion fue sincronizada.');
        this.reset();
        this.load();
      }
    });
  }

  protected edit(row: Location): void {
    this.editing.set(row);
    this.form.reset({
      locationName: row.locationName,
      locationType: row.locationType,
      description: row.description ?? '',
      active: row.active ?? true
    });
  }

  protected reset(): void {
    this.editing.set(null);
    this.form.reset({ locationName: '', locationType: 'WAREHOUSE', description: '', active: true });
  }

  protected remove(row: Location): void {
    if (!window.confirm(`¿Eliminar ubicacion "${row.locationName}"?`)) return;
    this.api.remove(row.id).subscribe({
      next: () => {
        this.feedback.success('Ubicacion eliminada', 'Registro eliminado.');
        this.load();
      }
    });
  }

  private load(): void {
    this.api.list().subscribe((rows) =>
      this.rows.set(rows.map((row) => ({ ...row, locationTypeLabel: this.locationTypeLabel(row.locationType) })))
    );
  }

  private locationTypeLabel(type: Location['locationType']): string {
    switch (type) {
      case 'WAREHOUSE':
        return 'Bodega';
      case 'BAR':
        return 'Barra';
      case 'KITCHEN':
        return 'Cocina';
      case 'FRIDGE':
        return 'Nevera';
      case 'AUXILIARY':
        return 'Auxiliar';
      default:
        return type;
    }
  }
}
