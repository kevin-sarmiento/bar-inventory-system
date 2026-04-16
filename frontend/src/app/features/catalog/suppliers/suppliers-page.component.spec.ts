import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SuppliersPageComponent } from './suppliers-page.component';
import { SupplierApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

describe('SuppliersPageComponent', () => {
  const supplierApi = jasmine.createSpyObj<SupplierApiService>('SupplierApiService', ['list', 'create', 'update', 'remove']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    supplierApi.list.calls.reset();
    supplierApi.create.calls.reset();
    supplierApi.update.calls.reset();
    supplierApi.remove.calls.reset();
    feedback.success.calls.reset();

    supplierApi.list.and.returnValue(of([{ id: 1, name: 'Distribuidora Tropical', email: 'ventas@tropical.com', phone: '3000000000', address: 'Centro' }] as any));
    supplierApi.create.and.returnValue(of({ id: 2 } as any));
    supplierApi.update.and.returnValue(of({ id: 1 } as any));
    supplierApi.remove.and.returnValue(of(void 0));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [SuppliersPageComponent],
      providers: [
        { provide: SupplierApiService, useValue: supplierApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea proveedores con datos simulados', () => {
    const fixture = TestBed.createComponent(SuppliersPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.form.setValue({ name: 'Bebidas Caribe', email: 'compras@caribe.com', phone: '3111111111', address: 'Norte' });
    component.save();

    expect(supplierApi.create).toHaveBeenCalled();
  });

  it('elimina proveedores confirmados', () => {
    const fixture = TestBed.createComponent(SuppliersPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.remove({ id: 1, name: 'Distribuidora Tropical' });

    expect(supplierApi.remove).toHaveBeenCalledWith(1);
  });
});
