import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { MenuItem, MenuItemPayload, Recipe, RecipeItem } from '../../core/models/catalog.models';
import { MenuApiService, RecipeApiService } from '../../core/services/catalog-api.service';
import { StockApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { SearchSelectComponent, SearchSelectOption } from '../../shared/ui/search-select.component';

@Component({
  selector: 'app-menu-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor, NgIf, SearchSelectComponent],
  template: `
    <section class="page-stack">
      <header class="page-header"><div><span class="chip">Fase 2</span><h2 class="section-title">Menu</h2><p class="section-subtitle">Items vendibles asociados a recetas.</p></div></header>
      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field"><label>Nombre menu</label><input class="input" formControlName="menuName"></div>
          <div class="field">
            <label>Receta</label>
            <app-search-select
              formControlName="recipeId"
              [options]="recipeOptions()"
              [placeholder]="'Selecciona una receta disponible'"
              [searchPlaceholder]="'Buscar receta...'"
            />
          </div>
          <div class="field"><label>Precio venta</label><input type="number" class="input" formControlName="salePrice"></div>
        </div>
        <div class="state-box" *ngIf="selectedRecipeBlocked()">
          <strong>Receta no disponible</strong>
          <p>No se puede agregar al menu una receta con productos faltantes o sin ingredientes.</p>
        </div>
        <div class="actions"><button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button><button class="btn btn-primary" type="submit">{{ editing() ? 'Actualizar' : 'Crear' }}</button></div>
      </form>
      <app-data-table
        [rows]="rows()"
        [columns]="columns"
        [clientSearch]="true"
        [searchPlaceholder]="'Nombre de carta, producto o precio...'"
        (edit)="edit($event)"
        (remove)="remove($event)"
      />
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.actions{display:flex;justify-content:flex-end;gap:.75rem}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MenuPageComponent implements OnInit {
  private readonly api = inject(MenuApiService);
  private readonly recipesApi = inject(RecipeApiService);
  private readonly stockApi = inject(StockApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);
  protected readonly rows = signal<MenuItem[]>([]);
  protected readonly recipes = signal<Recipe[]>([]);
  protected readonly blockedRecipeIds = signal<Set<number>>(new Set());
  protected readonly recipeStatus = signal<Record<number, string>>({});
  protected readonly editing = signal<MenuItem | null>(null);
  protected readonly recipeOptions = computed<SearchSelectOption<number>[]>(() =>
    this.recipes().map((recipe) => ({
      value: recipe.id,
      label: recipe.recipeName,
      secondaryLabel: this.recipeStatus()[recipe.id] ?? recipe.description ?? null
    }))
  );
  protected readonly selectedRecipeBlocked = computed(() => this.blockedRecipeIds().has(this.form.getRawValue().recipeId));
  protected readonly columns: DataColumn<MenuItem>[] = [
    { key: 'menuName', label: 'Nombre' },
    { key: 'recipeId', label: 'Receta ID' },
    { key: 'salePrice', label: 'Precio', type: 'currency' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    menuName: ['', Validators.required],
    recipeId: [0, Validators.required],
    salePrice: [0, Validators.required]
  });

  ngOnInit(): void {
    forkJoin([this.api.list(), this.recipesApi.list(), this.stockApi.list()]).subscribe(([rows, recipes, stock]) => {
      this.rows.set(rows);
      this.recipes.set(recipes);
      this.computeRecipeAvailability(recipes, stock);
      this.reset();
    });
  }

  protected save(): void {
    if (this.blockedRecipeIds().has(this.form.getRawValue().recipeId)) {
      this.feedback.error('Receta no disponible', 'No se puede agregar al menu una receta con productos faltantes.');
      return;
    }
    const payload = this.form.getRawValue() as MenuItemPayload;
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.subscribe({ next: () => { this.feedback.success('Menu guardado', 'Item del menu sincronizado.'); this.reset(); this.load(); }});
  }

  protected edit(row: MenuItem): void {
    this.editing.set(row);
    this.form.reset({ menuName: row.menuName, recipeId: row.recipeId, salePrice: row.salePrice });
  }

  protected reset(): void {
    this.editing.set(null);
    const firstAvailableRecipe = this.recipes().find((recipe) => !this.blockedRecipeIds().has(recipe.id));
    this.form.reset({ menuName: '', recipeId: firstAvailableRecipe?.id ?? 0, salePrice: 0 });
  }

  protected remove(row: MenuItem): void {
    if (!window.confirm(`Eliminar menu "${row.menuName}"?`)) {
      return;
    }
    this.api.remove(row.id).subscribe({ next: () => { this.feedback.success('Menu eliminado', 'Registro eliminado.'); this.load(); }});
  }

  private load(): void {
    this.api.list().subscribe((rows) => this.rows.set(rows));
  }

  private computeRecipeAvailability(recipes: Recipe[], stock: Array<{ productId: number; quantityBase: number }>): void {
    const availableProductIds = new Set(
      stock.filter((balance) => Number(balance.quantityBase) > 0).map((balance) => balance.productId)
    );

    if (!recipes.length) {
      this.blockedRecipeIds.set(new Set());
      this.recipeStatus.set({});
      return;
    }

    forkJoin(recipes.map((recipe) => this.recipesApi.listItems(recipe.id))).subscribe((recipeItemsList) => {
      const blocked = new Set<number>();
      const statuses: Record<number, string> = {};

      recipes.forEach((recipe, index) => {
        const items = recipeItemsList[index] as RecipeItem[];
        if (!items.length) {
          blocked.add(recipe.id);
          statuses[recipe.id] = 'Sin ingredientes';
          return;
        }

        const missingItems = items.filter((item) => !availableProductIds.has(item.productId));
        if (missingItems.length) {
          blocked.add(recipe.id);
          statuses[recipe.id] = 'No disponible: faltan productos';
          return;
        }

        statuses[recipe.id] = 'Disponible para menu';
      });

      this.blockedRecipeIds.set(blocked);
      this.recipeStatus.set(statuses);
    });
  }
}
