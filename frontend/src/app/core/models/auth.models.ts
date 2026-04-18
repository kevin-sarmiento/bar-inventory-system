export interface AuthRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  token: string;
}

export interface AuthUser {
  username: string;
  roles: AppRole[];
  token: string;
  userId?: number;
}

export type AppRole =
  | 'ADMINISTRADOR'
  | 'GERENTE'
  | 'INVENTARIO'
  | 'CAJERO'
  | 'BARTENDER';
