import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UsersPageComponent } from './users-page.component';
import { UserAdminApiService } from '../../core/services/admin-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('UsersPageComponent', () => {
  const userApi = jasmine.createSpyObj<UserAdminApiService>('UserAdminApiService', ['list', 'listRoles', 'create', 'setActive', 'resetPassword']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    userApi.list.calls.reset();
    userApi.listRoles.calls.reset();
    userApi.create.calls.reset();
    userApi.setActive.calls.reset();
    userApi.resetPassword.calls.reset();
    feedback.success.calls.reset();

    userApi.list.and.returnValue(of([{ id: 1, username: 'admin', fullName: 'Admin Demo', email: 'admin@sake.com', active: true, roles: ['ADMINISTRADOR'] }] as any));
    userApi.listRoles.and.returnValue(of([{ name: 'ADMINISTRADOR' }, { name: 'CAJERO' }] as any));
    userApi.create.and.returnValue(of({ id: 2 } as any));
    userApi.setActive.and.returnValue(of({ id: 1 } as any));
    userApi.resetPassword.and.returnValue(of({ status: 'OK' }));

    spyOn(window, 'prompt').and.returnValue('Temporal2026');

    await TestBed.configureTestingModule({
      imports: [UsersPageComponent],
      providers: [
        { provide: UserAdminApiService, useValue: userApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea usuarios con datos simulados y recarga el listado', () => {
    const fixture = TestBed.createComponent(UsersPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.form.setValue({
      username: 'bartender.demo',
      fullName: 'Bartender Demo',
      email: 'bartender@sake.com',
      password: 'Bartender123',
      active: true,
      roleName: 'CAJERO'
    });
    component.save();

    expect(userApi.create).toHaveBeenCalled();
    expect(feedback.success).toHaveBeenCalledWith('Usuario creado', 'Nuevo usuario disponible en el sistema.');
  });

  it('permite cambiar el estado y restablecer contrasena', () => {
    const fixture = TestBed.createComponent(UsersPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.toggleActive({ id: 1, active: true } as any);
    component.resetPassword({ id: 1, username: 'admin' } as any);

    expect(userApi.setActive).toHaveBeenCalledWith(1, false);
    expect(userApi.resetPassword).toHaveBeenCalledWith(1, { temporaryPassword: 'Temporal2026' });
  });
});
