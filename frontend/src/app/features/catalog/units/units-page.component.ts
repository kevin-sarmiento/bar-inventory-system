import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DataColumn } from '../../../core/models/api.models';
import { Unit, UnitPayload } from '../../../core/models/catalog.models';
import { UnitApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../../shared/ui/data-table.component';

type UnitRow = Unit & { unitTypeLabel: string };

@Component({
  selector: 'app-units-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 1</span>
          <h2 class="section-title">Unidades de medida</h2>
          <p class="section-subtitle">Define las unidades para compras, inventario y preparaciones.</p>
        </div>
      </header>

      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field">
            <label>Codigo</label>
            <input class="input" formControlName="code" placeholder="ml">
          </div>
          <div class="field">
            <label>Nombre</label>
            <input class="input" formControlName="name" placeholder="Mililitro">
          </div>
          <div class="field">
            <label>Tipo</label>
            <select class="select" formControlName="unitType">
              <option value="VOLUME">Volumen</option>
              <option value="WEIGHT">Peso</option>
              <option value="COUNT">Conteo</option>
            </select>
          </div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button>
          <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving()">{{ editing() ? 'Actualizar' : 'Crear' }}</button>
        </div>
      </form>

      <app-data-table [rows]="rows()" [columns]="columns" (edit)="edit($event)" (remove)="remove($event)" />
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.actions{display:flex;justify-content:flex-end;gap:.75rem}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UnitsPageComponent implements OnInit {
  private readonly api = inject(UnitApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly rows = signal<UnitRow[]>([]);
  protected readonly saving = signal(false);
  protected readonly editing = signal<Unit | null>(null);
  protected readonly columns: DataColumn<UnitRow>[] = [
    { key: 'code', label: 'Codigo' },
    { key: 'name', label: 'Nombre' },
    { key: 'unitTypeLabel', label: 'Tipo', type: 'badge' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    unitType: ['VOLUME' as Unit['unitType'], Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  protected save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = this.form.getRawValue() as UnitPayload;
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.feedback.success('Unidad guardada', 'El catalogo de unidades fue actualizado.');
        this.reset();
        this.load();
      }
    });
  }

  protected edit(item: Unit): void {
    this.editing.set(item);
    this.form.reset({ code: item.code, name: item.name, unitType: item.unitType });
  }

  protected reset(): void {
    this.editing.set(null);
    this.form.reset({ code: '', name: '', unitType: 'VOLUME' });
  }

  protected remove(item: Unit): void {
    if (!window.confirm(`¿Eliminar unidad "${item.name}"?`)) return;
    this.api.remove(item.id).subscribe({
      next: () => {
        this.feedback.success('Unidad eliminada', 'Registro eliminado.');
        this.load();
      }
    });
  }

  private load(): void {
    this.api.list().subscribe((rows) => this.rows.set(rows.map((row) => ({ ...row, unitTypeLabel: this.unitTypeLabel(row.unitType) }))));
  }

  private unitTypeLabel(type: Unit['unitType']): string {
    switch (type) {
      case 'VOLUME':
        return 'Volumen';
      case 'WEIGHT':
        return 'Peso';
      case 'COUNT':
        return 'Conteo';
      default:
        return type;
    }
  }
}
