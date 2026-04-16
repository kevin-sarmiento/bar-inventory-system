import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ShiftsPageComponent } from './shifts-page.component';
import { UserAdminApiService } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService } from '../../core/services/catalog-api.service';
import { ShiftApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('ShiftsPageComponent', () => {
  const shiftApi = jasmine.createSpyObj<ShiftApiService>('ShiftApiService', ['list', 'myShifts', 'create', 'update', 'cancelShift', 'checkIn', 'checkOut']);
  const usersApi = jasmine.createSpyObj<UserAdminApiService>('UserAdminApiService', ['list']);
  const locationsApi = jasmine.createSpyObj<LocationApiService>('LocationApiService', ['list']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  function authStub(roles: string[]) {
    return {
      hasAnyRole(expected: string[]) {
        return expected.some((role) => roles.includes(role));
      }
    };
  }

  beforeEach(() => {
    shiftApi.list.calls.reset();
    shiftApi.myShifts.calls.reset();
    shiftApi.create.calls.reset();
    shiftApi.update.calls.reset();
    shiftApi.cancelShift.calls.reset();
    shiftApi.checkIn.calls.reset();
    shiftApi.checkOut.calls.reset();
    usersApi.list.calls.reset();
    locationsApi.list.calls.reset();
    feedback.success.calls.reset();

    shiftApi.list.and.returnValue(of([{ id: 1, userId: 2, fullName: 'Gerente Demo', locationId: 1, locationName: 'Barra principal', roleName: 'GERENTE', scheduledStart: '2026-04-16T08:00:00Z', scheduledEnd: '2026-04-16T17:00:00Z', status: 'PROGRAMADO' }] as any));
    shiftApi.myShifts.and.returnValue(of([{ id: 2, userId: 5, fullName: 'Caja Demo', locationId: 1, locationName: 'Barra principal', roleName: 'CAJERO', scheduledStart: '2026-04-16T18:00:00Z', scheduledEnd: '2026-04-17T01:00:00Z', status: 'PROGRAMADO' }] as any));
    shiftApi.checkIn.and.returnValue(of({ id: 2 } as any));
    shiftApi.checkOut.and.returnValue(of({ id: 2 } as any));
    shiftApi.create.and.returnValue(of({ id: 3 } as any));
    usersApi.list.and.returnValue(of([{ id: 2, fullName: 'Gerente Demo' }] as any));
    locationsApi.list.and.returnValue(of([{ id: 1, locationName: 'Barra principal' }] as any));
  });

  async function createComponent(roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [ShiftsPageComponent],
      providers: [
        { provide: AuthService, useValue: authStub(roles) },
        { provide: ShiftApiService, useValue: shiftApi },
        { provide: UserAdminApiService, useValue: usersApi },
        { provide: LocationApiService, useValue: locationsApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ShiftsPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  it('carga gestion completa para administracion', async () => {
    const { fixture, component } = await createComponent(['ADMINISTRADOR']);
    expect(component.canManage()).toBeTrue();
    expect(shiftApi.list).toHaveBeenCalled();
    expect(usersApi.list).toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });

  it('carga solo turnos propios para caja', async () => {
    const { fixture, component } = await createComponent(['CAJERO']);
    expect(component.canManage()).toBeFalse();
    expect(shiftApi.myShifts).toHaveBeenCalled();
    expect(shiftApi.list).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('registra entrada y salida del turno seleccionado', async () => {
    const { component } = await createComponent(['BARTENDER']);
    component.selectShift({ id: 2 } as any);

    component.checkInSelected();
    component.checkOutSelected();

    expect(shiftApi.checkIn).toHaveBeenCalledWith(2);
    expect(shiftApi.checkOut).toHaveBeenCalledWith(2);
  });
});
