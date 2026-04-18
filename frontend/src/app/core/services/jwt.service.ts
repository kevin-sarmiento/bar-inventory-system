import { Injectable } from '@angular/core';
import { AppRole, AuthUser } from '../models/auth.models';

interface JwtPayload {
  sub?: string;
  roles?: string[];
  exp?: number;
  uid?: number;
}

@Injectable({ providedIn: 'root' })
export class JwtService {
  decodeToken(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      if (!payload) {
        return null;
      }
      return JSON.parse(atob(this.toBase64(payload)));
    } catch {
      return null;
    }
  }

  buildUser(token: string): AuthUser | null {
    const payload = this.decodeToken(token);
    if (!payload?.sub) {
      return null;
    }
    const rawUid = payload.uid;
    const userId =
      typeof rawUid === 'number'
        ? rawUid
        : rawUid != null && rawUid !== ''
          ? Number(rawUid)
          : undefined;
    return {
      username: payload.sub,
      roles: (payload.roles ?? []) as AppRole[],
      token,
      userId: Number.isFinite(userId) ? userId : undefined
    };
  }

  isExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    return !payload?.exp || Date.now() >= payload.exp * 1000;
  }

  private toBase64(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4;
    if (padding === 0) {
      return normalized;
    }
    return normalized + '='.repeat(4 - padding);
  }
}
