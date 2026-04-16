import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { finalize } from 'rxjs';
import { Category, CategoryPayload } from '../../../core/models/catalog.models';
import { DataColumn } from '../../../core/models/api.models';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../../shared/ui/data-table.component';
import { CategoryFormComponent } from './category-form.component';
import { CategoryService } from './category.service';

@Component({
  selector: 'app-categories-page',
  standalone: true,
  imports: [NgIf, DataTableComponent, CategoryFormComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 1</span>
          <h2 class="section-title">Gestion de categorias</h2>
          <p class="section-subtitle">Organiza los grupos principales de productos del negocio.</p>
        </div>
        <button class="btn btn-warning" type="button" (click)="prepareCreate()">
          {{ editingCategory() ? 'Nueva categoria' : 'Refrescar formulario' }}
        </button>
      </header>

      <app-category-form
        [category]="editingCategory()"
        [loading]="saving()"
        (save)="saveCategory($event)"
        (cancel)="prepareCreate()"
      />

      <div class="list-head">
        <strong>{{ categories().length }} categorias</strong>
        <span *ngIf="loading()">Cargando listado...</span>
      </div>

      <app-data-table
        [rows]="categories()"
        [columns]="columns"
        [emptyTitle]="'No hay categorias registradas'"
        [emptyDescription]="'Crea la primera categoria para arrancar el catalogo.'"
        (edit)="editCategory($event)"
        (remove)="deleteCategory($event)"
      />
    </section>
  `,
  styles: [`
    .list-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      color: var(--color-muted);
      flex-wrap: wrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesPageComponent implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly categories = signal<Category[]>([]);
  protected readonly editingCategory = signal<Category | null>(null);
  protected readonly columns: DataColumn<Category>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripcion' }
  ];

  ngOnInit(): void {
    this.loadCategories();
  }

  protected prepareCreate(): void {
    this.editingCategory.set(null);
  }

  protected editCategory(category: Category): void {
    this.editingCategory.set(category);
  }

  protected saveCategory(payload: CategoryPayload): void {
    const category = this.editingCategory();
    this.saving.set(true);

    const request$ = category
      ? this.categoryService.update(category.id, payload)
      : this.categoryService.create(payload);

    request$
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.feedback.success(
            category ? 'Categoria actualizada' : 'Categoria creada',
            'La informacion fue guardada correctamente.'
          );
          this.prepareCreate();
          this.loadCategories();
        }
      });
  }

  protected deleteCategory(category: Category): void {
    const confirmed = window.confirm(`¿Deseas eliminar la categoria "${category.name}"?`);
    if (!confirmed) {
      return;
    }

    this.loading.set(true);
    this.categoryService.remove(category.id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          this.feedback.success('Categoria eliminada', 'La fila fue removida del catalogo.');
          this.loadCategories();
        }
      });
  }

  private loadCategories(): void {
    this.loading.set(true);
    this.categoryService.list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (categories) => this.categories.set(categories)
      });
  }
}
