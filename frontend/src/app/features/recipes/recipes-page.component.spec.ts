import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RecipesPageComponent } from './recipes-page.component';
import { ProductApiService, RecipeApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { AiRecipeRecommenderService } from '../../core/services/ai-recipe-recommender.service';
import { StockApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('RecipesPageComponent', () => {
  const recipeApi = jasmine.createSpyObj<RecipeApiService>('RecipeApiService', [
    'list',
    'create',
    'update',
    'remove',
    'listItems',
    'addItem',
    'removeItem'
  ]);
  const productApi = jasmine.createSpyObj<ProductApiService>('ProductApiService', ['list']);
  const unitApi = jasmine.createSpyObj<UnitApiService>('UnitApiService', ['list']);
  const stockApi = jasmine.createSpyObj<StockApiService>('StockApiService', ['list']);
  const aiRecipeRecommender = jasmine.createSpyObj<AiRecipeRecommenderService>('AiRecipeRecommenderService', [
    'getSuggestions'
  ]);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success', 'error']);

  beforeEach(async () => {
    recipeApi.list.calls.reset();
    recipeApi.create.calls.reset();
    recipeApi.update.calls.reset();
    recipeApi.remove.calls.reset();
    recipeApi.listItems.calls.reset();
    recipeApi.addItem.calls.reset();
    recipeApi.removeItem.calls.reset();
    productApi.list.calls.reset();
    unitApi.list.calls.reset();
    stockApi.list.calls.reset();
    aiRecipeRecommender.getSuggestions.calls.reset();
    feedback.success.calls.reset();
    feedback.error.calls.reset();

    recipeApi.list.and.returnValue(of([{ id: 1, recipeName: 'Mojito base', description: 'Receta clasica', active: true }] as any));
    recipeApi.create.and.returnValue(of({ id: 2, recipeName: 'Pina colada' } as any));
    recipeApi.update.and.returnValue(of({ id: 1 } as any));
    recipeApi.remove.and.returnValue(of(void 0));
    recipeApi.listItems.and.returnValue(of([{ id: 7, productId: 3, unitId: 4, quantity: 60 }] as any));
    recipeApi.addItem.and.returnValue(of({ id: 8 } as any));
    recipeApi.removeItem.and.returnValue(of(void 0));
    productApi.list.and.returnValue(of([{ id: 3, name: 'Ron Blanco' }] as any));
    unitApi.list.and.returnValue(of([{ id: 4, name: 'ml', code: 'ML' }] as any));
    stockApi.list.and.returnValue(of([{ id: 1, productId: 3, locationId: 1, quantityBase: 2, avgUnitCostBase: 10 }] as any));
    aiRecipeRecommender.getSuggestions.and.returnValue({
      inventoryEmpty: false,
      requestQuery: '',
      exactRecipeRequested: false,
      inventorySummary: 'Inventario analizado: Ron Blanco.',
      message: 'Puedes preparar esta receta con lo que tienes o explorar opciones cercanas.',
      suggestions: [
        {
          name: 'Mojito',
          description: 'Clasico con ron y limon.',
          ingredients: ['ron blanco', 'limon', 'azucar'],
          availableIngredients: ['ron blanco'],
          missingIngredients: ['limon', 'azucar'],
          canPrepare: false,
          matchScore: 0.33,
          requestedMatch: false
        }
      ]
    } as any);
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [RecipesPageComponent],
      providers: [
        { provide: RecipeApiService, useValue: recipeApi },
        { provide: ProductApiService, useValue: productApi },
        { provide: UnitApiService, useValue: unitApi },
        { provide: StockApiService, useValue: stockApi },
        { provide: AiRecipeRecommenderService, useValue: aiRecipeRecommender },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea recetas y selecciona la nueva receta simulada', () => {
    const fixture = TestBed.createComponent(RecipesPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.recipeForm.setValue({ recipeName: 'Margarita', description: 'Clasica', active: true });
    component.saveRecipe();

    expect(recipeApi.create).toHaveBeenCalled();
    expect(feedback.success).toHaveBeenCalledWith('Receta guardada', 'La receta fue sincronizada.');
  });

  it('solicita recomendaciones con el inventario disponible', () => {
    const fixture = TestBed.createComponent(RecipesPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.recipeQuery.set('mojito');
    component.recommendRecipes();

    expect(aiRecipeRecommender.getSuggestions).toHaveBeenCalledWith([{ name: 'Ron Blanco', quantity: 2 }], 'mojito');
    expect(feedback.success).toHaveBeenCalledWith(
      'Recomendacion IA',
      'Puedes preparar esta receta con lo que tienes o explorar opciones cercanas.'
    );
  });

  it('agrega y elimina ingredientes de una receta', () => {
    const fixture = TestBed.createComponent(RecipesPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.selectRecipe({ id: 1, recipeName: 'Mojito base', description: 'Receta clasica', active: true });
    component.itemForm.setValue({ productId: 3, unitId: 4, quantity: 45 });
    component.addItem();
    component.removeItem({ id: 7 });

    expect(recipeApi.addItem).toHaveBeenCalledWith(1, { productId: 3, unitId: 4, quantity: 45 });
    expect(recipeApi.removeItem).toHaveBeenCalledWith(7);
  });
});
