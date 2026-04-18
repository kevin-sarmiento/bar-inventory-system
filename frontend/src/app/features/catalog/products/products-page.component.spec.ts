import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProductsPageComponent } from './products-page.component';
import { CategoryApiService, LocationApiService, ProductApiService, UnitApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

describe('ProductsPageComponent', () => {
  const productApi = jasmine.createSpyObj<ProductApiService>('ProductApiService', ['list', 'create', 'update', 'remove']);
  const categoryApi = jasmine.createSpyObj<CategoryApiService>('CategoryApiService', ['list']);
  const unitApi = jasmine.createSpyObj<UnitApiService>('UnitApiService', ['list']);
  const locationsApi = jasmine.createSpyObj<LocationApiService>('LocationApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    productApi.list.calls.reset();
    productApi.create.calls.reset();
    productApi.update.calls.reset();
    productApi.remove.calls.reset();
    categoryApi.list.calls.reset();
    unitApi.list.calls.reset();
    locationsApi.list.calls.reset();
    feedback.success.calls.reset();

    productApi.list.and.returnValue(of([{ id: 1, sku: 'RON-01', name: 'Ron Blanco', categoryId: 1, baseUnitId: 2, minStockBaseQty: 10, active: true }] as any));
    productApi.create.and.returnValue(of({ id: 2 } as any));
    productApi.update.and.returnValue(of({ id: 1 } as any));
    productApi.remove.and.returnValue(of(void 0));
    categoryApi.list.and.returnValue(of([{ id: 1, name: 'Destilados' }] as any));
    unitApi.list.and.returnValue(of([{ id: 2, name: 'Botella', code: 'bot' }] as any));
    locationsApi.list.and.returnValue(of([{ id: 1, locationName: 'Barra principal' }] as any));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [ProductsPageComponent],
      providers: [
        { provide: ProductApiService, useValue: productApi },
        { provide: CategoryApiService, useValue: categoryApi },
        { provide: UnitApiService, useValue: unitApi },
        { provide: LocationApiService, useValue: locationsApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea productos con datos simulados', () => {
    const fixture = TestBed.createComponent(ProductsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.form.setValue({
      sku: 'GIN-02',
      name: 'Ginebra',
      categoryId: 1,
      baseUnitId: 2,
      defaultLocationId: 1,
      minStockBaseQty: 8,
      barcode: '1234567890',
      active: true,
      notes: 'Botella premium'
    });
    component.save();

    expect(productApi.create).toHaveBeenCalled();
  });

  it('elimina productos confirmados', () => {
    const fixture = TestBed.createComponent(ProductsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.remove({ id: 1, name: 'Ron Blanco' });

    expect(productApi.remove).toHaveBeenCalledWith(1);
  });
});
