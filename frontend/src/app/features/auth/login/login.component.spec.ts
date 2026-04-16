import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/services/auth.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

describe('LoginComponent', () => {
  const authService = jasmine.createSpyObj<AuthService>('AuthService', ['login']);
  const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    authService.login.and.returnValue(of({ token: 'jwt-demo' }));
    router.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('muestra SAKE destacado y conserva solo el texto corto de apoyo', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const content = fixture.nativeElement.textContent;
    expect(content).toContain('SAKE');
    expect(content).toContain('Administra inventario, productos, ventas y movimientos diarios');
    expect(content).not.toContain('centraliza la operacion de tu bar');
  });

  it('envia credenciales validas y redirige al panel', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    component.form.setValue({ username: 'admin', password: 'admin123' });
    component.submit();

    expect(authService.login).toHaveBeenCalledWith({ username: 'admin', password: 'admin123' });
    expect(feedback.success).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
