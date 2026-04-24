import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, concatMap, first, from, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import { AuthRequest, AuthResponse, AuthUser } from '../models/auth.models';
import { ApiUrlService } from './api-url.service';
import { JwtService } from './jwt.service';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly jwtService = inject(JwtService);
  private readonly tokenStorage = inject(TokenStorageService);

  private readonly currentUserSignal = signal<AuthUser | null>(this.restoreSession());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly roles = computed(() => this.currentUserSignal()?.roles ?? []);
  readonly userId = computed(() => this.currentUserSignal()?.userId ?? null);

  login(payload: AuthRequest): Observable<AuthResponse> {
    const endpoint = `${API_CONFIG.endpoints.auth}/login`;
    const candidates = this.apiUrl.getCandidates();

    return from(candidates).pipe(
      concatMap((baseUrl, index) =>
        this.http.post<AuthResponse>(`${baseUrl}${endpoint}`, payload).pipe(
          tap((response) => {
            this.apiUrl.setBaseUrl(baseUrl);
            this.startSession(response.token);
          }),
          catchError((error: HttpErrorResponse) => {
            const isLastCandidate = index === candidates.length - 1;
            if (error.status === 0 && !isLastCandidate) {
              return EMPTY;
            }
            return throwError(() => error);
          })
        )
      ),
      first()
    );
  }

  logout(): void {
    this.tokenStorage.clear();
    this.currentUserSignal.set(null);
    void this.router.navigate(['/login']);
  }

  hasAnyRole(roles: string[]): boolean {
    const currentRoles = this.roles();
    return roles.some((role) => currentRoles.includes(role as never));
  }

  getToken(): string | null {
    return this.currentUserSignal()?.token ?? this.tokenStorage.getToken();
  }

  startSession(token: string): void {
    this.tokenStorage.setToken(token);
    this.currentUserSignal.set(this.jwtService.buildUser(token));
  }

  private restoreSession(): AuthUser | null {
    const token = this.tokenStorage.getToken();
    if (!token || this.jwtService.isExpired(token)) {
      this.tokenStorage.clear();
      return null;
    }
    return this.jwtService.buildUser(token);
  }
}
