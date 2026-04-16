import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ReactiveFormsModule, FormArray, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Product, Recipe, RecipePayload, Unit } from '../../core/models/catalog.models';
import { ProductApiService, RecipeApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor, NgIf],
  template: `
    <section class="page-stack">
      <header class="page-header"><div><span class="chip">Fase 2</span><h2 class="section-title">Recetas</h2><p class="section-subtitle">Define preparaciones, ingredientes y cantidades del menu.</p></div></header>

      <form class="shell-card form-card" [formGroup]="recipeForm" (ngSubmit)="saveRecipe()">
        <div class="form-grid three-cols">
          <div class="field"><label>Nombre receta</label><input class="input" formControlName="recipeName"></div>
          <div class="field"><label>Descripción</label><input class="input" formControlName="description"></div>
          <div class="field"><label>Activa</label><select class="select" formControlName="active"><option [ngValue]="true">Activa</option><option [ngValue]="false">Inactiva</option></select></div>
        </div>
        <div class="actions"><button class="btn btn-secondary" type="button" (click)="resetRecipe()">Limpiar</button><button class="btn btn-primary" type="submit">{{ editingRecipe() ? 'Actualizar receta' : 'Crear receta' }}</button></div>
      </form>

      <app-data-table [rows]="recipes()" [columns]="recipeColumns" (edit)="selectRecipe($event)" (remove)="deleteRecipe($event)" />

      <article class="shell-card form-card" *ngIf="selectedRecipe() as selected">
        <div class="page-header">
          <div><h3 class="section-title">{{ selected.recipeName }}</h3><p class="section-subtitle">Ingredientes de la receta seleccionada.</p></div>
        </div>

        <form [formGroup]="itemForm" (ngSubmit)="addItem()">
          <div class="form-grid three-cols">
            <div class="field"><label>Producto</label><select class="select" formControlName="productId"><option *ngFor="let item of products()" [ngValue]="item.id">{{ item.name }}</option></select></div>
            <div class="field"><label>Unidad</label><select class="select" formControlName="unitId"><option *ngFor="let item of units()" [ngValue]="item.id">{{ item.name }}</option></select></div>
            <div class="field"><label>Cantidad</label><input type="number" class="input" formControlName="quantity"></div>
          </div>
          <div class="actions"><button class="btn btn-primary" type="submit">Agregar ingrediente</button></div>
        </form>

        <app-data-table [rows]="items()" [columns]="itemColumns" (edit)="noop($event)" (remove)="removeItem($event)" />
      </article>
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.actions{display:flex;justify-content:flex-end;gap:.75rem}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesPageComponent implements OnInit {
  private readonly api = inject(RecipeApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);
  protected readonly recipes = signal<Recipe[]>([]);
  protected readonly items = signal<any[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly selectedRecipe = signal<Recipe | null>(null);
  protected readonly editingRecipe = signal<Recipe | null>(null);
  protected readonly recipeColumns: DataColumn<Recipe>[] = [
    { key: 'recipeName', label: 'Receta' },
    { key: 'description', label: 'Descripción' },
    { key: 'active', label: 'Estado', type: 'boolean' }
  ];
  protected readonly itemColumns: DataColumn<any>[] = [
    { key: 'productId', label: 'Producto ID' },
    { key: 'unitId', label: 'Unidad ID' },
    { key: 'quantity', label: 'Cantidad' }
  ];
  protected readonly recipeForm = this.fb.nonNullable.group({
    recipeName: ['', Validators.required],
    description: [''],
    active: [true]
  });
  protected readonly itemForm = this.fb.nonNullable.group({
    productId: [0, Validators.required],
    unitId: [0, Validators.required],
    quantity: [1, Validators.required]
  });

  ngOnInit(): void {
    forkJoin([this.api.list(), this.productsApi.list(), this.unitsApi.list()]).subscribe(([recipes, products, units]) => {
      this.recipes.set(recipes);
      this.products.set(products);
      this.units.set(units);
      this.resetRecipe();
      this.itemForm.reset({ productId: products[0]?.id ?? 0, unitId: units[0]?.id ?? 0, quantity: 1 });
    });
  }

  protected saveRecipe(): void {
    const payload = this.recipeForm.getRawValue() as RecipePayload;
    const action$ = this.editingRecipe() ? this.api.update(this.editingRecipe()!.id, payload) : this.api.create(payload);
    action$.subscribe({
      next: (recipe) => {
        this.feedback.success('Receta guardada', 'La receta fue sincronizada.');
        this.loadRecipes(recipe.id);
        this.selectRecipe(recipe);
        this.resetRecipe();
      }
    });
  }

  protected selectRecipe(recipe: Recipe): void {
    this.selectedRecipe.set(recipe);
    this.editingRecipe.set(recipe);
    this.recipeForm.reset({ recipeName: recipe.recipeName, description: recipe.description ?? '', active: recipe.active ?? true });
    this.api.listItems(recipe.id).subscribe((items) => this.items.set(items));
  }

  protected resetRecipe(): void {
    this.editingRecipe.set(null);
    this.recipeForm.reset({ recipeName: '', description: '', active: true });
  }

  protected addItem(): void {
    const recipe = this.selectedRecipe();
    if (!recipe) return;
    this.api.addItem(recipe.id, this.itemForm.getRawValue()).subscribe({
      next: () => {
        this.feedback.success('Ingrediente agregado', 'La receta fue actualizada.');
        this.api.listItems(recipe.id).subscribe((items) => this.items.set(items));
      }
    });
  }

  protected removeItem(item: any): void {
    if (!window.confirm('¿Eliminar ingrediente de la receta?')) return;
    this.api.removeItem(item.id).subscribe({ next: () => { this.feedback.success('Ingrediente eliminado', 'Registro eliminado.'); this.api.listItems(this.selectedRecipe()!.id).subscribe((items) => this.items.set(items)); }});
  }

  protected deleteRecipe(recipe: Recipe): void {
    if (!window.confirm(`¿Eliminar receta "${recipe.recipeName}"?`)) return;
    this.api.remove(recipe.id).subscribe({ next: () => { this.feedback.success('Receta eliminada', 'Registro eliminado.'); this.loadRecipes(); if (this.selectedRecipe()?.id === recipe.id) { this.selectedRecipe.set(null); this.items.set([]); } }});
  }

  protected noop(_: unknown): void {}

  private loadRecipes(selectId?: number): void {
    this.api.list().subscribe((recipes) => {
      this.recipes.set(recipes);
      if (selectId) {
        const found = recipes.find((recipe) => recipe.id === selectId);
        if (found) this.selectRecipe(found);
      }
    });
  }
}
