import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MenuPageComponent } from './menu-page.component';
import { MenuApiService, RecipeApiService } from '../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('MenuPageComponent', () => {
  const menuApi = jasmine.createSpyObj<MenuApiService>('MenuApiService', ['list', 'create', 'update', 'remove']);
  const recipeApi = jasmine.createSpyObj<RecipeApiService>('RecipeApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    menuApi.list.calls.reset();
    menuApi.create.calls.reset();
    menuApi.update.calls.reset();
    menuApi.remove.calls.reset();
    recipeApi.list.calls.reset();
    feedback.success.calls.reset();

    menuApi.list.and.returnValue(of([{ id: 1, menuName: 'Mojito', recipeId: 10, salePrice: 28000 }] as any));
    menuApi.create.and.returnValue(of({ id: 2 } as any));
    menuApi.update.and.returnValue(of({ id: 1 } as any));
    menuApi.remove.and.returnValue(of(void 0));
    recipeApi.list.and.returnValue(of([{ id: 10, recipeName: 'Mojito base' }] as any));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [MenuPageComponent],
      providers: [
        { provide: MenuApiService, useValue: menuApi },
        { provide: RecipeApiService, useValue: recipeApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea items de carta con datos simulados', () => {
    const fixture = TestBed.createComponent(MenuPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.form.setValue({ menuName: 'Gin tonic', recipeId: 10, salePrice: 32000 });
    component.save();

    expect(menuApi.create).toHaveBeenCalledWith({ menuName: 'Gin tonic', recipeId: 10, salePrice: 32000 });
  });

  it('elimina items de carta confirmados', () => {
    const fixture = TestBed.createComponent(MenuPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.remove({ id: 1, menuName: 'Mojito' });

    expect(menuApi.remove).toHaveBeenCalledWith(1);
  });
});
