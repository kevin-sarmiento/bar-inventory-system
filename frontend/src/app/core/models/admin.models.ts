export interface UserAdmin {
  id: number;
  username: string;
  fullName: string;
  email?: string | null;
  active: boolean;
  roles: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  email?: string | null;
  password: string;
  active?: boolean | null;
  roleNames?: string[];
}

export interface AssignRolesPayload {
  roleNames: string[];
}

export interface ResetPasswordPayload {
  temporaryPassword: string;
}

export interface RoleDto {
  id: number;
  name: string;
  description?: string | null;
}
