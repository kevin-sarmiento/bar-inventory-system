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
}

export type AppRole =
  | 'ADMINISTRADOR'
  | 'GERENTE'
  | 'INVENTARIO'
  | 'CAJERO'
  | 'BARTENDER';
