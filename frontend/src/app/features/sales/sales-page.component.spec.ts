import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SalesPageComponent } from './sales-page.component';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, MenuApiService, ProductApiService, UnitApiService } from '../../core/services/catalog-api.service';
import { SalesApiService, ShiftApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('SalesPageComponent', () => {
  const salesApi = jasmine.createSpyObj<SalesApiService>('SalesApiService', ['list', 'create', 'postInventory']);
  const shiftApi = jasmine.createSpyObj<ShiftApiService>('ShiftApiService', ['forSale']);
  const locationsApi = jasmine.createSpyObj<LocationApiService>('LocationApiService', ['list']);
  const menuApi = jasmine.createSpyObj<MenuApiService>('MenuApiService', ['list']);
  const productsApi = jasmine.createSpyObj<ProductApiService>('ProductApiService', ['list']);
  const unitsApi = jasmine.createSpyObj<UnitApiService>('UnitApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success', 'error']);

  function authStub(roles: string[], uid = 2) {
    return {
      hasAnyRole(expected: string[]) {
        return expected.some((role) => roles.includes(role));
      },
      userId: () => uid
    };
  }

  beforeEach(async () => {
    salesApi.list.and.returnValue(of([{ id: 50, saleNumber: 'V-10', saleDatetime: '2026-04-16T10:00:00Z', locationId: 1, cashierUserId: 2, totalAmount: 75000, status: 'PAID', inventoryProcessed: false } as any]));
    salesApi.create.and.returnValue(of({ id: 51 } as any));
    salesApi.postInventory.and.returnValue(of({ transactionId: 900 }));
    shiftApi.forSale.and.returnValue(of([]));
    locationsApi.list.and.returnValue(of([{ id: 1, locationName: 'Barra principal' }] as any));
    menuApi.list.and.returnValue(of([{ id: 2, menuName: 'Mojito' }] as any));
    productsApi.list.and.returnValue(of([{ id: 3, name: 'Ron Blanco' }] as any));
    unitsApi.list.and.returnValue(of([{ id: 4, name: 'ml' }] as any));
  });

  async function createComponent(roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [SalesPageComponent],
      providers: [
        { provide: AuthService, useValue: authStub(roles) },
        { provide: SalesApiService, useValue: salesApi },
        { provide: ShiftApiService, useValue: shiftApi },
        { provide: LocationApiService, useValue: locationsApi },
        { provide: MenuApiService, useValue: menuApi },
        { provide: ProductApiService, useValue: productsApi },
        { provide: UnitApiService, useValue: unitsApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(SalesPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  it('permite crear ventas a caja', async () => {
    const { fixture, component } = await createComponent(['CAJERO']);
    expect(component.canCreate()).toBeTrue();
    expect(component.canPostInventory()).toBeFalse();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('permite a inventario procesar inventario sin mostrar alta de ventas', async () => {
    const { fixture, component } = await createComponent(['INVENTARIO']);
    expect(component.canCreate()).toBeFalse();
    expect(component.canPostInventory()).toBeTrue();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('guarda una venta con datos simulados', async () => {
    const { component } = await createComponent(['BARTENDER']);
    component.form.patchValue({
      locationId: 1,
      shiftId: null,
      status: 'PAID',
      processInventory: true
    });
    component.items.at(0).patchValue({ menuItemId: 2, productId: null, unitId: null, quantity: 2, unitPrice: 22500 });

    component.save();

    expect(salesApi.create).toHaveBeenCalled();
    const call = salesApi.create.calls.mostRecent().args[0] as { cashierUserId: number };
    expect(call.cashierUserId).toBe(2);
    expect(feedback.success).toHaveBeenCalledWith('Venta creada', 'La venta fue registrada correctamente.');
  });

  it('procesa inventario para un rol autorizado', async () => {
    const { component } = await createComponent(['ADMINISTRADOR']);
    component.postInventory({ id: 50, cashierUserId: 2, status: 'PAID', inventoryProcessed: false } as any);
    expect(salesApi.postInventory).toHaveBeenCalledWith(50);
  });
});
