import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { AssignRolesPayload, CreateUserPayload, ResetPasswordPayload, RoleDto, UserAdmin } from '../models/admin.models';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class UserAdminApiService extends BaseApiService<UserAdmin, CreateUserPayload> {
  protected override endpoint = API_CONFIG.endpoints.users;

  setActive(id: number, value: boolean) {
    return this.http.patch<UserAdmin>(this.url(`/${id}/active`), null, {
      params: new HttpParams().set('value', value)
    });
  }

  assignRoles(id: number, payload: AssignRolesPayload) {
    return this.http.put<UserAdmin>(this.url(`/${id}/roles`), payload);
  }

  resetPassword(id: number, payload: ResetPasswordPayload) {
    return this.http.put<{ status: string }>(this.url(`/${id}/password`), payload);
  }

  listRoles() {
    return this.http.get<RoleDto[]>(this.url('/roles/catalog'));
  }
}
