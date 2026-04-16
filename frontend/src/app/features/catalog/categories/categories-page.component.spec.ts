import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CategoriesPageComponent } from './categories-page.component';
import { CategoryService } from './category.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

describe('CategoriesPageComponent', () => {
  const categoryService = jasmine.createSpyObj<CategoryService>('CategoryService', ['list', 'create', 'update', 'remove']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    categoryService.list.calls.reset();
    categoryService.create.calls.reset();
    categoryService.update.calls.reset();
    categoryService.remove.calls.reset();
    feedback.success.calls.reset();

    categoryService.list.and.returnValue(of([{ id: 1, name: 'Destilados', description: 'Botellas base' }] as any));
    categoryService.create.and.returnValue(of({ id: 2 } as any));
    categoryService.update.and.returnValue(of({ id: 1 } as any));
    categoryService.remove.and.returnValue(of(void 0));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [CategoriesPageComponent],
      providers: [
        { provide: CategoryService, useValue: categoryService },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea categorias y refresca el catalogo', () => {
    const fixture = TestBed.createComponent(CategoriesPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.saveCategory({ name: 'Jugos', description: 'Mezcladores' });

    expect(categoryService.create).toHaveBeenCalledWith({ name: 'Jugos', description: 'Mezcladores' });
    expect(feedback.success).toHaveBeenCalled();
  });

  it('elimina categorias confirmadas', () => {
    const fixture = TestBed.createComponent(CategoriesPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.deleteCategory({ id: 1, name: 'Destilados' });

    expect(categoryService.remove).toHaveBeenCalledWith(1);
  });
});
