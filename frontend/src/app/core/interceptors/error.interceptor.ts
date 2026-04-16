import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UiFeedbackService } from '../services/ui-feedback.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(UiFeedbackService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        authService.logout();
        feedback.error('Sesion expirada', 'Vuelve a iniciar sesion para continuar.');
        return throwError(() => error);
      }

      if (error.status === 403) {
        void router.navigate(['/dashboard']);
        feedback.error('Acceso restringido', 'No tienes permisos para entrar a esta seccion.');
        return throwError(() => error);
      }

      if (error.status === 0) {
        feedback.error('Sin conexion', 'No fue posible conectar con el servidor. Verifica que este ejecutandose y vuelve a intentarlo.');
        return throwError(() => error);
      }

      const message =
        error.error?.error ??
        error.error?.details ??
        'No fue posible completar la solicitud.';

      feedback.error('Operacion no completada', message);
      return throwError(() => error);
    })
  );
};
