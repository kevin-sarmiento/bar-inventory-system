import { Injectable } from '@angular/core';
import { AppRole, AuthUser } from '../models/auth.models';

interface JwtPayload {
  sub?: string;
  roles?: string[];
  exp?: number;
}

@Injectable({ providedIn: 'root' })
export class JwtService {
  decodeToken(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }

  buildUser(token: string): AuthUser | null {
    const payload = this.decodeToken(token);
    if (!payload?.sub) {
      return null;
    }
    return {
      username: payload.sub,
      roles: (payload.roles ?? []) as AppRole[],
      token
    };
  }

  isExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    return !payload?.exp || Date.now() >= payload.exp * 1000;
  }
}
