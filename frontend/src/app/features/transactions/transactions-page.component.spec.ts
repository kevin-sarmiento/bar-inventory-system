import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TransactionsPageComponent } from './transactions-page.component';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, ProductApiService, SupplierApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { TransactionApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('TransactionsPageComponent', () => {
  const transactionApi = jasmine.createSpyObj<TransactionApiService>('TransactionApiService', ['list', 'create', 'updateStatus']);
  const locationsApi = jasmine.createSpyObj<LocationApiService>('LocationApiService', ['list']);
  const suppliersApi = jasmine.createSpyObj<SupplierApiService>('SupplierApiService', ['list']);
  const productsApi = jasmine.createSpyObj<ProductApiService>('ProductApiService', ['list']);
  const unitsApi = jasmine.createSpyObj<UnitApiService>('UnitApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  function authStub(roles: string[]) {
    return {
      hasAnyRole(expected: string[]) {
        return expected.some((role) => roles.includes(role));
      }
    };
  }

  beforeEach(async () => {
    transactionApi.list.and.returnValue(of([{ id: 10, transactionNumber: 'TX-1', transactionType: 'PURCHASE', transactionDate: '2026-04-16T10:00:00Z', status: 'POSTED', referenceText: 'Compra inicial' } as any]));
    transactionApi.create.and.returnValue(of({ id: 11 } as any));
    transactionApi.updateStatus.and.returnValue(of({ id: 10 } as any));
    locationsApi.list.and.returnValue(of([{ id: 1, locationName: 'Barra principal' }] as any));
    suppliersApi.list.and.returnValue(of([{ id: 2, name: 'Distribuidora Tropical' }] as any));
    productsApi.list.and.returnValue(of([{ id: 3, name: 'Ron Blanco' }] as any));
    unitsApi.list.and.returnValue(of([{ id: 4, name: 'Botella' }] as any));
  });

  async function createComponent(roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [TransactionsPageComponent],
      providers: [
        { provide: AuthService, useValue: authStub(roles) },
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: LocationApiService, useValue: locationsApi },
        { provide: SupplierApiService, useValue: suppliersApi },
        { provide: ProductApiService, useValue: productsApi },
        { provide: UnitApiService, useValue: unitsApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(TransactionsPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  it('permite crear transacciones a administracion e inventario', async () => {
    const { fixture, component } = await createComponent(['ADMINISTRADOR']);
    expect(component.canCreate()).toBeTrue();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('permite publicar o cancelar transacciones a gerencia sin mostrar el formulario de alta', async () => {
    const { fixture, component } = await createComponent(['GERENTE']);
    expect(component.canCreate()).toBeFalse();
    expect(component.canUpdateStatus()).toBeTrue();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('deja a bartender solo en consulta', async () => {
    const { component } = await createComponent(['BARTENDER']);
    expect(component.canCreate()).toBeFalse();
    expect(component.canUpdateStatus()).toBeFalse();
  });

  it('guarda una transaccion con datos simulados', async () => {
    const { component } = await createComponent(['INVENTARIO']);
    component.form.patchValue({
      transactionNumber: 'TX-200',
      transactionType: 'PURCHASE',
      transactionDate: '2026-04-16T08:00',
      sourceLocationId: 1,
      targetLocationId: null,
      supplierId: 2,
      status: 'POSTED',
      createdBy: 1,
      referenceText: 'Factura 45',
      reason: 'Compra semanal'
    });
    component.items.at(0).patchValue({ productId: 3, unitId: 4, quantity: 5, unitCost: 100000 });

    component.save();

    expect(transactionApi.create).toHaveBeenCalled();
    expect(feedback.success).toHaveBeenCalledWith('Transaccion creada', 'Movimiento guardado correctamente.');
  });

  it('publica una transaccion cuando el rol tiene permiso', async () => {
    const { component } = await createComponent(['GERENTE']);
    component.markPosted({ id: 10 } as any);
    expect(transactionApi.updateStatus).toHaveBeenCalledWith(10, 'POSTED');
  });
});
