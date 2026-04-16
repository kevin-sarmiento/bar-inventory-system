import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RecipesPageComponent } from './recipes-page.component';
import { ProductApiService, RecipeApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('RecipesPageComponent', () => {
  const recipeApi = jasmine.createSpyObj<RecipeApiService>('RecipeApiService', ['list', 'create', 'update', 'remove', 'listItems', 'addItem', 'removeItem']);
  const productApi = jasmine.createSpyObj<ProductApiService>('ProductApiService', ['list']);
  const unitApi = jasmine.createSpyObj<UnitApiService>('UnitApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

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
    feedback.success.calls.reset();

    recipeApi.list.and.returnValue(of([{ id: 1, recipeName: 'Mojito base', description: 'Receta clasica', active: true }] as any));
    recipeApi.create.and.returnValue(of({ id: 2, recipeName: 'Piña colada' } as any));
    recipeApi.update.and.returnValue(of({ id: 1 } as any));
    recipeApi.remove.and.returnValue(of(void 0));
    recipeApi.listItems.and.returnValue(of([{ id: 7, productId: 3, unitId: 4, quantity: 60 }] as any));
    recipeApi.addItem.and.returnValue(of({ id: 8 } as any));
    recipeApi.removeItem.and.returnValue(of(void 0));
    productApi.list.and.returnValue(of([{ id: 3, name: 'Ron Blanco' }] as any));
    unitApi.list.and.returnValue(of([{ id: 4, name: 'ml' }] as any));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [RecipesPageComponent],
      providers: [
        { provide: RecipeApiService, useValue: recipeApi },
        { provide: ProductApiService, useValue: productApi },
        { provide: UnitApiService, useValue: unitApi },
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
