import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DOCUMENT, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { Location, Product, Recipe, RecipeItemPayload, RecipePayload, Unit } from '../../core/models/catalog.models';
import { LocationApiService, ProductApiService, RecipeApiService, UnitApiService } from '../../core/services/catalog-api.service';
import {
  AiRecipeRecommenderService,
  PantryProduct,
  RecipeSuggestion,
  RecipeSuggestionResult
} from '../../core/services/ai-recipe-recommender.service';
import { StockApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { SearchSelectComponent, SearchSelectOption } from '../../shared/ui/search-select.component';

type RecipeItemRow = {
  id: number;
  productId: number;
  unitId: number;
  quantity: number;
  productName: string;
  locationName: string;
  unitName: string;
};

type RecipeTableRow = Recipe & {
  ingredientsSummary: string;
};

@Component({
  selector: 'app-recipes-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor, NgIf, SearchSelectComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 2</span>
          <h2 class="section-title">Recetas</h2>
          <p class="section-subtitle">Define preparaciones, ingredientes y cantidades del menu.</p>
        </div>
      </header>

      <form id="recipe-editor" class="shell-card form-card" [formGroup]="recipeForm" (ngSubmit)="saveRecipe()">
        <div class="form-grid three-cols">
          <div class="field">
            <label>Nombre receta</label>
            <input class="input" formControlName="recipeName" />
          </div>
          <div class="field">
            <label>Descripcion</label>
            <input class="input" formControlName="description" />
          </div>
          <div class="field">
            <label>Activa</label>
            <select class="select" formControlName="active">
              <option [ngValue]="true">Activa</option>
              <option [ngValue]="false">Inactiva</option>
            </select>
          </div>
          <div class="field field-span">
            <label for="recipe-ai-query">Receta a consultar (opcional)</label>
            <input
              id="recipe-ai-query"
              class="input"
              type="text"
              placeholder="Ej: mojito, margarita, gin tonic, nachos..."
              [value]="recipeQuery()"
              (input)="recipeQuery.set($any($event.target).value)"
            />
          </div>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="resetRecipe()">Limpiar</button>
          <button class="btn btn-ai-gradient" type="button" (click)="recommendRecipes()">Recomendar receta con IA</button>
          <button class="btn btn-primary" type="submit">{{ editingRecipe() ? 'Actualizar receta' : 'Crear receta' }}</button>
        </div>

        <div class="ingredient-builder">
          <div class="page-header">
            <div>
              <h3 class="section-title ingredient-title">Ingredientes de la receta</h3>
              <p class="section-subtitle">Selecciona productos del sistema y revisa su ubicacion antes de guardar la receta.</p>
            </div>
          </div>

          <div [formGroup]="itemForm">
            <div class="form-grid three-cols">
              <div class="field">
                <label>Ingrediente (producto)</label>
                <app-search-select
                  formControlName="productId"
                  [options]="productOptions()"
                  [placeholder]="'Selecciona un ingrediente'"
                  [searchPlaceholder]="'Buscar ingrediente...'"
                  [allowClear]="true"
                />
              </div>
              <div class="field">
                <label>Unidad</label>
                <app-search-select
                  formControlName="unitId"
                  [options]="unitOptions()"
                  [placeholder]="'Selecciona una unidad'"
                  [searchPlaceholder]="'Buscar unidad...'"
                />
              </div>
              <div class="field">
                <label>Cantidad</label>
                <input type="number" class="input" formControlName="quantity" />
              </div>
            </div>

            <div class="actions">
              <button class="btn btn-secondary" type="button" (click)="addItem()">
                {{ selectedRecipe() ? 'Agregar ingrediente a la receta' : 'Agregar ingrediente al borrador' }}
              </button>
            </div>
          </div>

          <app-data-table
            [rows]="itemRows()"
            [columns]="itemColumns"
            [clientSearch]="true"
            [searchPlaceholder]="'Ingrediente, ubicacion, cantidad o unidad...'"
            [hideEditAction]="true"
            [emptyTitle]="'Sin ingredientes cargados'"
            [emptyDescription]="'Agrega productos para completar la receta.'"
            (remove)="removeItem($event)"
          />
        </div>
      </form>

      <article class="shell-card recommendation-card">
        <div class="page-header">
          <div>
            <h3 class="section-title">Sugerencias inteligentes</h3>
            <p class="section-subtitle">
              Recetas y preparaciones tipicas de bar comparadas contra los productos registrados.
            </p>
          </div>
        </div>

        <div class="state-box" *ngIf="recommendationState()?.inventoryEmpty">
          <strong>Sin productos para analizar</strong>
          <p>{{ recommendationState()?.message }}</p>
        </div>

        <div
          class="state-box"
          *ngIf="recommendationState() && !recommendationState()!.inventoryEmpty && !recommendationState()!.suggestions.length"
        >
          <strong>Sin coincidencias exactas</strong>
          <p>{{ recommendationState()?.message }}</p>
        </div>

        <div class="recommendation-summary" *ngIf="recommendationState()?.suggestions?.length">
          <strong>{{ recommendationState()?.message }}</strong>
          <p *ngIf="inventorySummary()">{{ inventorySummary() }}</p>
          <p *ngIf="recommendationState()?.requestQuery">Consulta: "{{ recommendationState()?.requestQuery }}"</p>
        </div>

        <div class="recommendation-grid" *ngIf="recommendationState()?.suggestions?.length">
          <article class="shell-card suggestion-item" *ngFor="let suggestion of recommendationState()!.suggestions">
            <div class="suggestion-head">
              <div>
                <h4>{{ suggestion.name }}</h4>
                <p>{{ suggestion.description }}</p>
              </div>
              <span class="badge" [class.badge-off]="!suggestion.canPrepare">
                {{ suggestion.canPrepare ? 'Lista para preparar' : 'Receta cercana' }}
              </span>
            </div>

            <p class="suggestion-copy">
              {{ suggestion.canPrepare ? 'Puedes preparar esta receta con lo que tienes' : missingMessage(suggestion) }}
            </p>

            <div class="suggestion-meta">
              <div>
                <strong>Ingredientes necesarios</strong>
                <p>{{ suggestion.ingredients.join(', ') }}</p>
              </div>
              <div>
                <strong>Disponibles</strong>
                <p>{{ suggestion.availableIngredients.length ? suggestion.availableIngredients.join(', ') : 'Sin coincidencias detectadas.' }}</p>
              </div>
              <div *ngIf="suggestion.missingIngredients.length">
                <strong>Faltantes</strong>
                <p>{{ suggestion.missingIngredients.join(', ') }}</p>
              </div>
            </div>

            <div class="suggestion-actions">
              <span class="badge" *ngIf="isSuggestionCreated(suggestion); else createSuggestionAction">
                Receta creada
              </span>
              <ng-template #createSuggestionAction>
                <button
                  class="btn btn-primary"
                  type="button"
                  [disabled]="creatingSuggestion() === suggestion.name"
                  (click)="createRecipeFromSuggestion(suggestion)"
                >
                  {{ creatingSuggestion() === suggestion.name ? 'Creando receta...' : 'Crear receta automaticamente' }}
                </button>
              </ng-template>
            </div>
          </article>
        </div>
      </article>

      <app-data-table
        [rows]="recipeRows()"
        [columns]="recipeColumns"
        [clientSearch]="true"
        [searchPlaceholder]="'Nombre de receta, descripcion o ingredientes...'"
        (edit)="selectRecipe($event)"
        (remove)="deleteRecipe($event)"
      />
    </section>
  `,
  styles: [`
    .form-card {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .three-cols {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .field-span {
      grid-column: 1 / -1;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-ai-gradient {
      color: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.7);
      background-image: linear-gradient(120deg, #ffffff 0%, #d8ecff 48%, #ffd4ea 100%);
      box-shadow: 0 10px 24px rgba(104, 149, 255, 0.18);
    }

    .btn-ai-gradient:hover {
      transform: translateY(-1px);
      box-shadow: 0 14px 28px rgba(255, 120, 190, 0.18);
      filter: saturate(1.05);
    }

    .recommendation-card {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .ingredient-builder {
      display: grid;
      gap: 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(41, 50, 65, 0.08);
    }

    .ingredient-title {
      font-size: 1.25rem;
    }

    .recommendation-summary p,
    .suggestion-head p,
    .suggestion-meta p {
      margin: 0.2rem 0 0;
      color: var(--color-muted);
    }

    .recommendation-grid {
      display: grid;
      gap: 1rem;
    }

    .suggestion-item {
      padding: 1rem;
      display: grid;
      gap: 1rem;
    }

    .suggestion-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .suggestion-head h4 {
      margin: 0;
      font-family: 'Sora', sans-serif;
      font-size: 1.05rem;
    }

    .suggestion-copy {
      margin: 0;
      font-weight: 600;
    }

    .suggestion-meta {
      display: grid;
      gap: 0.8rem;
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .suggestion-actions {
      display: flex;
      justify-content: flex-end;
    }

    @media (max-width: 900px) {
      .three-cols,
      .suggestion-meta {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecipesPageComponent implements OnInit {
  private readonly document = inject(DOCUMENT);
  private readonly api = inject(RecipeApiService);
  private readonly productsApi = inject(ProductApiService);
  private readonly unitsApi = inject(UnitApiService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly stockApi = inject(StockApiService);
  private readonly aiRecipeRecommender = inject(AiRecipeRecommenderService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly recipes = signal<Recipe[]>([]);
  protected readonly items = signal<any[]>([]);
  protected readonly recipeIngredients = signal<Record<number, string>>({});
  protected readonly products = signal<Product[]>([]);
  protected readonly units = signal<Unit[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly inventoryProducts = signal<PantryProduct[]>([]);
  protected readonly selectedRecipe = signal<Recipe | null>(null);
  protected readonly editingRecipe = signal<Recipe | null>(null);
  protected readonly recipeQuery = signal('');
  protected readonly creatingSuggestion = signal<string | null>(null);
  protected readonly recommendationState = signal<RecipeSuggestionResult | null>(null);
  protected readonly inventorySummary = computed(() => this.recommendationState()?.inventorySummary ?? '');

  protected readonly productOptions = computed<SearchSelectOption<number>[]>(() =>
    this.products().map((product) => ({
      value: product.id,
      label: product.name,
      secondaryLabel: this.locationNameById(product.defaultLocationId) ?? product.sku ?? null,
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

  protected readonly recipeRows = computed<RecipeTableRow[]>(() =>
    this.recipes().map((recipe) => ({
      ...recipe,
      ingredientsSummary: this.recipeIngredients()[recipe.id] ?? 'Sin ingredientes'
    }))
  );

  protected readonly recipeColumns: DataColumn<RecipeTableRow>[] = [
    { key: 'recipeName', label: 'Receta' },
    { key: 'description', label: 'Descripcion' },
    { key: 'ingredientsSummary', label: 'Ingredientes' },
    { key: 'active', label: 'Estado', type: 'boolean' }
  ];

  protected readonly itemRows = computed<RecipeItemRow[]>(() =>
    this.items().map((item) => ({
      id: item.id,
      productId: item.productId,
      unitId: item.unitId,
      quantity: item.quantity,
      productName: this.productNameById(item.productId),
      locationName: this.locationNameForProduct(item.productId),
      unitName: this.unitNameById(item.unitId)
    }))
  );

  protected readonly itemColumns: DataColumn<RecipeItemRow>[] = [
    { key: 'productName', label: 'Ingrediente' },
    { key: 'locationName', label: 'Ubicacion' },
    { key: 'unitName', label: 'Unidad' },
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
    forkJoin({
      recipes: this.api.list(),
      products: this.productsApi.list(),
      units: this.unitsApi.list(),
      locations: this.locationsApi.list(),
      stock: this.stockApi.list()
    }).subscribe(({ recipes, products, units, locations, stock }) => {
      this.recipes.set(recipes);
      this.products.set(products);
      this.units.set(units);
      this.locations.set(locations);
      const inventoryMap = new Map<number, number>();
      for (const balance of stock) {
        const quantity = Number(balance.quantityBase);
        if (quantity > 0) {
          inventoryMap.set(balance.productId, (inventoryMap.get(balance.productId) ?? 0) + quantity);
        }
      }
      // Si no hay stock consolidado aun, usamos los productos creados en el sistema
      // para evitar falsos vacios y seguir recomendando preparaciones de bar.
      this.inventoryProducts.set(
        products
          .filter((product) => inventoryMap.size === 0 || inventoryMap.has(product.id))
          .map((product) => ({
            name: product.name,
            quantity: inventoryMap.get(product.id) ?? 0
          }))
      );
      this.resetRecipe();
      this.itemForm.reset({
        productId: products[0]?.id ?? 0,
        unitId: units[0]?.id ?? 0,
        quantity: 1
      });
      this.loadRecipeIngredients(recipes);
      this.recommendRecipes();
    });
  }

  protected saveRecipe(): void {
    const payload = this.recipeForm.getRawValue() as RecipePayload;
    const editing = this.editingRecipe();
    const action$ = editing ? this.api.update(editing.id, payload) : this.api.create(payload);
    action$.subscribe({
      next: (recipe) => {
        const pendingDraftItems = editing ? [] : this.items().filter((item) => item.id < 0);
        if (!pendingDraftItems.length) {
          this.feedback.success('Receta guardada', 'La receta fue sincronizada.');
          this.loadRecipes(recipe.id);
          if (!editing) {
            this.selectedRecipe.set(recipe);
          }
          return;
        }

        forkJoin(pendingDraftItems.map((item) => this.persistRecipeItem(recipe.id, item))).subscribe({
          next: (results) => {
            const failedItems = results.filter((result) => !result.ok);
            if (failedItems.length) {
              this.feedback.error(
                'Receta creada con observaciones',
                'La receta se creo, pero algunos ingredientes no se pudieron guardar. Revisa la tabla y vuelve a intentarlo.'
              );
            } else {
              this.feedback.success('Receta guardada', 'La receta fue creada con sus ingredientes.');
            }
            this.loadRecipes(recipe.id);
            this.selectedRecipe.set(recipe);
          }
        });
      }
    });
  }

  protected recommendRecipes(): void {
    const result = this.aiRecipeRecommender.getSuggestions(this.inventoryProducts(), this.recipeQuery());
    this.recommendationState.set(result);
    if (result.inventoryEmpty) {
      this.feedback.error('Recomendacion IA', result.message);
      return;
    }
    this.feedback.success('Recomendacion IA', result.message);
  }

  protected selectRecipe(recipe: RecipeTableRow | Recipe): void {
    this.selectedRecipe.set(recipe);
    this.editingRecipe.set(recipe);
    this.recipeForm.reset({
      recipeName: recipe.recipeName,
      description: recipe.description ?? '',
      active: recipe.active ?? true
    });
    this.api.listItems(recipe.id).subscribe((items) => {
      this.items.set(items);
      this.scrollToEditor();
    });
  }

  protected resetRecipe(): void {
    this.editingRecipe.set(null);
    this.selectedRecipe.set(null);
    this.items.set([]);
    this.recipeForm.reset({ recipeName: '', description: '', active: true });
    this.itemForm.reset({
      productId: this.products()[0]?.id ?? 0,
      unitId: this.units()[0]?.id ?? 0,
      quantity: 1
    });
  }

  protected addItem(): void {
    const formValue = this.itemForm.getRawValue();
    if (!formValue.productId || !formValue.unitId) {
      this.feedback.error('Ingrediente incompleto', 'Selecciona un producto y una unidad antes de agregar el ingrediente.');
      return;
    }
    if (this.hasIngredientConflict(formValue.productId, formValue.unitId)) {
      this.feedback.error('Ingrediente duplicado', 'Ese ingrediente con la misma unidad ya existe en la receta.');
      return;
    }
    const recipe = this.selectedRecipe();
    if (!recipe) {
      const tempId = -Date.now();
      this.items.update((current) => [...current, { id: tempId, ...formValue }]);
      this.feedback.success('Ingrediente agregado', 'El ingrediente quedo agregado al borrador de la receta.');
      return;
    }
    this.api.addItem(recipe.id, {
      recipeId: recipe.id,
      productId: formValue.productId,
      unitId: formValue.unitId,
      quantity: formValue.quantity
    }).subscribe({
      next: () => {
        this.feedback.success('Ingrediente agregado', 'La receta fue actualizada.');
        this.api.listItems(recipe.id).subscribe((items) => this.items.set(items));
        this.refreshRecipeIngredients();
      }
    });
  }

  protected removeItem(item: RecipeItemRow): void {
    if (!window.confirm('Eliminar ingrediente de la receta?')) {
      return;
    }
    if (item.id < 0) {
      this.items.update((current) => current.filter((entry) => entry.id !== item.id));
      this.feedback.success('Ingrediente eliminado', 'Ingrediente eliminado del borrador.');
      return;
    }
    this.api.removeItem(item.id).subscribe({
      next: () => {
        this.feedback.success('Ingrediente eliminado', 'Registro eliminado.');
        this.api.listItems(this.selectedRecipe()!.id).subscribe((items) => this.items.set(items));
        this.refreshRecipeIngredients();
      }
    });
  }

  protected deleteRecipe(recipe: Recipe): void {
    if (!window.confirm(`Eliminar receta "${recipe.recipeName}"?`)) {
      return;
    }
    this.api.remove(recipe.id).subscribe({
      next: () => {
        this.feedback.success('Receta eliminada', 'Registro eliminado.');
        this.loadRecipes();
        if (this.selectedRecipe()?.id === recipe.id) {
          this.selectedRecipe.set(null);
          this.items.set([]);
        }
      }
    });
  }

  protected missingMessage(suggestion: RecipeSuggestion): string {
    if (!suggestion.missingIngredients.length) {
      return 'Puedes preparar esta receta con lo que tienes.';
    }
    return `Te faltan estos ingredientes: ${suggestion.missingIngredients.join(', ')}`;
  }

  protected createRecipeFromSuggestion(suggestion: RecipeSuggestion): void {
    const existing = this.recipes().find((recipe) => this.normalize(recipe.recipeName) === this.normalize(suggestion.name));
    if (existing) {
      this.feedback.error('Receta existente', 'Esa sugerencia ya fue creada en el sistema.');
      this.selectRecipe(existing);
      return;
    }

    this.creatingSuggestion.set(suggestion.name);
    const payload: RecipePayload = {
      recipeName: suggestion.name,
      description: this.buildSuggestionDescription(suggestion),
      active: true
    };

    this.api.create(payload).subscribe({
      next: (recipe) => {
        const items = this.resolveRecipeItems(suggestion);
        const addItems$ = items.length
          ? forkJoin(
              items.map((item) =>
                this.api.addItem(recipe.id, {
                  ...item,
                  recipeId: recipe.id
                })
              )
            )
          : of([]);
        addItems$.subscribe({
          next: () => {
            this.feedback.success(
              'Receta creada',
              items.length
                ? 'La receta se creo y se cargaron automaticamente los ingredientes encontrados.'
                : 'La receta se creo, pero no se encontraron ingredientes equivalentes para cargar automaticamente.'
            );
            this.loadRecipes(recipe.id);
            this.creatingSuggestion.set(null);
          },
          error: () => {
            this.creatingSuggestion.set(null);
          }
        });
      },
      error: () => {
        this.creatingSuggestion.set(null);
      }
    });
  }

  protected noop(_: unknown): void {}

  protected isSuggestionCreated(suggestion: RecipeSuggestion): boolean {
    return this.recipes().some((recipe) => this.normalize(recipe.recipeName) === this.normalize(suggestion.name));
  }

  /**
   * Convierte ingredientes sugeridos por IA en items reales del catalogo.
   * Solo agrega coincidencias confiables para no crear recetas con productos incorrectos.
   */
  private resolveRecipeItems(suggestion: RecipeSuggestion): RecipeItemPayload[] {
    const usedProducts = new Set<number>();
    const items: RecipeItemPayload[] = [];

    for (const ingredient of suggestion.ingredients) {
      const match = this.findBestProductMatch(ingredient);
      if (!match || usedProducts.has(match.id)) {
        continue;
      }
      usedProducts.add(match.id);
      items.push({
        recipeId: null,
        productId: match.id,
        unitId: match.baseUnitId,
        quantity: 1
      });
    }

    return items;
  }

  private findBestProductMatch(ingredient: string): Product | null {
    const normalizedIngredient = this.normalize(ingredient);
    let bestMatch: Product | null = null;
    let bestScore = 0;

    for (const product of this.products()) {
      const productText = this.normalize([product.name, product.sku, product.barcode, product.notes].filter(Boolean).join(' '));
      const score = this.matchScore(normalizedIngredient, productText);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = product;
      }
    }

    return bestScore >= 2 ? bestMatch : null;
  }

  private matchScore(ingredient: string, productText: string): number {
    if (!ingredient || !productText) {
      return 0;
    }
    if (productText === ingredient) {
      return 5;
    }
    if (productText.includes(ingredient) || ingredient.includes(productText)) {
      return 4;
    }

    const ingredientTokens = ingredient.split(' ').filter(Boolean);
    const productTokens = productText.split(' ').filter(Boolean);
    const sharedTokens = ingredientTokens.filter((token) => productTokens.includes(token)).length;
    return sharedTokens;
  }

  private buildSuggestionDescription(suggestion: RecipeSuggestion): string {
    const base = `${suggestion.description} Sugerencia generada automaticamente desde recomendaciones IA del bar.`;
    if (!suggestion.missingIngredients.length) {
      return base;
    }
    return `${base} Ingredientes faltantes detectados: ${suggestion.missingIngredients.join(', ')}.`;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private loadRecipes(selectId?: number): void {
    this.api.list().subscribe((recipes) => {
      this.recipes.set(recipes);
      this.loadRecipeIngredients(recipes);
      if (selectId) {
        const found = recipes.find((recipe) => recipe.id === selectId);
        if (found) {
          this.selectRecipe(found);
        }
      }
    });
  }

  private refreshRecipeIngredients(): void {
    this.loadRecipeIngredients(this.recipes());
  }

  private loadRecipeIngredients(recipes: Recipe[]): void {
    if (!recipes.length) {
      this.recipeIngredients.set({});
      return;
    }

    forkJoin(
      recipes.map((recipe) =>
        this.api.listItems(recipe.id).pipe(
          map((items) => ({
            recipeId: recipe.id,
            summary: items.length
              ? items.map((item) => this.productNameById(item.productId)).join(', ')
              : 'Sin ingredientes'
          })),
          catchError(() =>
            of({
              recipeId: recipe.id,
              summary: 'Sin ingredientes'
            })
          )
        )
      )
    ).subscribe((entries) => {
      const nextMap: Record<number, string> = {};
      for (const entry of entries) {
        nextMap[entry.recipeId] = entry.summary;
      }
      this.recipeIngredients.set(nextMap);
    });
  }

  private scrollToEditor(): void {
    const editor = this.document.getElementById('recipe-editor');
    editor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  private hasIngredientConflict(productId: number, unitId: number): boolean {
    return this.items().some((item) => item.productId === productId && item.unitId === unitId);
  }

  private persistRecipeItem(recipeId: number, item: { productId: number; unitId: number; quantity: number }) {
    return this.api.addItem(recipeId, {
      recipeId,
      productId: item.productId,
      unitId: item.unitId,
      quantity: item.quantity
    }).pipe(
      map(() => ({ ok: true })),
      // Uniformamos el resultado para que forkJoin no falle completo por un solo ingrediente.
      catchError(() => of({ ok: false })),
    );
  }

  private productNameById(productId: number): string {
    return this.products().find((product) => product.id === productId)?.name ?? `#${productId}`;
  }

  private unitNameById(unitId: number): string {
    const unit = this.units().find((item) => item.id === unitId);
    if (!unit) {
      return `#${unitId}`;
    }
    return `${unit.name} (${unit.code})`;
  }

  private locationNameForProduct(productId: number): string {
    const product = this.products().find((item) => item.id === productId);
    return this.locationNameById(product?.defaultLocationId);
  }

  private locationNameById(locationId?: number | null): string {
    if (locationId == null) {
      return 'Sin ubicacion';
    }
    return this.locations().find((location) => location.id === locationId)?.locationName ?? `#${locationId}`;
  }
}
