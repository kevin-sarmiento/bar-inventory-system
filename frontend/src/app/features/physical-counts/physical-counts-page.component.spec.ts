import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PhysicalCountsPageComponent } from './physical-counts-page.component';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService, ProductApiService } from '../../core/services/catalog-api.service';
import { PhysicalCountApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('PhysicalCountsPageComponent', () => {
  const physicalCountApi = jasmine.createSpyObj<PhysicalCountApiService>('PhysicalCountApiService', ['list', 'create', 'closeCount']);
  const locationsApi = jasmine.createSpyObj<LocationApiService>('LocationApiService', ['list']);
  const productsApi = jasmine.createSpyObj<ProductApiService>('ProductApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  function authStub(roles: string[], uid = 3) {
    return {
      hasAnyRole(expected: string[]) {
        return expected.some((role) => roles.includes(role));
      },
      userId: () => uid
    };
  }

  beforeEach(async () => {
    physicalCountApi.list.and.returnValue(of([{ id: 70, countNumber: 'CF-1', locationId: 1, countDate: '2026-04-16T12:00:00Z', status: 'OPEN', createdBy: 3 } as any]));
    physicalCountApi.create.and.returnValue(of({ id: 71 } as any));
    physicalCountApi.closeCount.and.returnValue(of({ status: 'CLOSED' }));
    locationsApi.list.and.returnValue(of([{ id: 1, locationName: 'Bodega principal' }] as any));
    productsApi.list.and.returnValue(of([{ id: 2, name: 'Vodka' }] as any));
  });

  async function createComponent(roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [PhysicalCountsPageComponent],
      providers: [
        { provide: AuthService, useValue: authStub(roles) },
        { provide: PhysicalCountApiService, useValue: physicalCountApi },
        { provide: LocationApiService, useValue: locationsApi },
        { provide: ProductApiService, useValue: productsApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(PhysicalCountsPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  it('permite a inventario crear conteos', async () => {
    const { fixture, component } = await createComponent(['INVENTARIO']);
    expect(component.canCreate()).toBeTrue();
    expect(component.canClose()).toBeFalse();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('permite a gerencia cerrar conteos sin mostrar el formulario', async () => {
    const { fixture, component } = await createComponent(['GERENTE']);
    expect(component.canCreate()).toBeFalse();
    expect(component.canClose()).toBeTrue();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('crea un conteo fisico con datos simulados', async () => {
    const { component } = await createComponent(['ADMINISTRADOR']);
    component.form.patchValue({
      countNumber: 'CF-22',
      locationId: 1,
      countDate: '2026-04-16T07:00',
      notes: 'Conteo de apertura',
      createdBy: 3
    });
    component.items.at(0).patchValue({ productId: 2, theoreticalQtyBase: 10, actualQtyBase: 9, notes: 'Falta una unidad' });

    component.save();

    expect(physicalCountApi.create).toHaveBeenCalled();
    expect(feedback.success).toHaveBeenCalledWith('Conteo creado', 'El conteo fue registrado correctamente.');
  });

  it('cierra un conteo cuando el rol tiene permiso', async () => {
    const { component } = await createComponent(['GERENTE']);
    component.close({ id: 70, createdBy: 3 } as any);
    expect(physicalCountApi.closeCount).toHaveBeenCalledWith(70, 3);
  });
});
