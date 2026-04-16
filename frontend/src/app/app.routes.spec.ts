import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  const children = appRoutes.find((route) => route.path === '')?.children ?? [];

  function routeRoles(path: string): string[] | undefined {
    return children.find((route) => route.path === path)?.data?.['roles'] as string[] | undefined;
  }

  it('protege usuarios solo para administradores', () => {
    expect(routeRoles('users')).toEqual(['ADMINISTRADOR']);
  });

  it('protege catalogos para administracion e inventario', () => {
    expect(routeRoles('catalog/categories')).toEqual(['ADMINISTRADOR', 'INVENTARIO']);
    expect(routeRoles('catalog/products')).toEqual(['ADMINISTRADOR', 'INVENTARIO']);
  });

  it('permite turnos a todos los roles operativos autenticados', () => {
    expect(routeRoles('shifts')).toEqual(['ADMINISTRADOR', 'GERENTE', 'INVENTARIO', 'CAJERO', 'BARTENDER']);
  });

  it('deja reportes solo a administracion, gerencia e inventario', () => {
    expect(routeRoles('reports')).toEqual(['ADMINISTRADOR', 'GERENTE', 'INVENTARIO']);
  });
});
