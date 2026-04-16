import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIf } from '@angular/common';
import { Category, CategoryPayload } from '../../../core/models/catalog.models';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf],
  template: `
    <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="form-head">
        <div>
          <h3>{{ editing ? 'Editar categoria' : 'Nueva categoria' }}</h3>
          <p>Completa la informacion principal del catalogo.</p>
        </div>
        <button class="btn btn-secondary" type="button" *ngIf="editing" (click)="cancel.emit()">Cancelar</button>
      </div>

      <div class="form-grid two-cols">
        <div class="field">
          <label for="name">Nombre</label>
          <input id="name" class="input" formControlName="name" placeholder="Licores premium">
          <span class="field-error" *ngIf="form.controls.name.touched && form.controls.name.invalid">El nombre es obligatorio.</span>
        </div>
      </div>

      <div class="field">
        <label for="description">Descripcion</label>
        <textarea id="description" rows="4" class="textarea" formControlName="description" placeholder="Categoria para insumos o botellas del bar"></textarea>
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="submit" [disabled]="form.invalid || loading">
          {{ loading ? 'Guardando...' : editing ? 'Actualizar categoria' : 'Crear categoria' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    .form-card {
      padding: 1.4rem;
      display: grid;
      gap: 1rem;
    }

    .form-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .form-head h3 {
      margin: 0;
      font-family: 'Sora', sans-serif;
    }

    .form-head p {
      margin: 0.4rem 0 0;
      color: var(--color-muted);
    }

    .two-cols {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .actions {
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .two-cols {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormComponent {
  @Input() category: Category | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<CategoryPayload>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly form = new FormBuilder().nonNullable.group({
    name: ['', Validators.required],
    description: ['']
  });

  protected get editing(): boolean {
    return !!this.category;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['category']) {
      this.form.reset({
        name: this.category?.name ?? '',
        description: this.category?.description ?? ''
      });
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.save.emit({
      name: raw.name.trim(),
      description: raw.description.trim() || null
    });
  }
}
