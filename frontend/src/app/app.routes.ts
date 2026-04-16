import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { MainLayoutComponent } from './core/layout/main-layout.component';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'catalog/categories',
        loadComponent: () => import('./features/catalog/categories/categories-page.component').then((m) => m.CategoriesPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'catalog/units',
        loadComponent: () => import('./features/catalog/units/units-page.component').then((m) => m.UnitsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'catalog/suppliers',
        loadComponent: () => import('./features/catalog/suppliers/suppliers-page.component').then((m) => m.SuppliersPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'catalog/locations',
        loadComponent: () => import('./features/catalog/locations/locations-page.component').then((m) => m.LocationsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'catalog/products',
        loadComponent: () => import('./features/catalog/products/products-page.component').then((m) => m.ProductsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'recipes',
        loadComponent: () => import('./features/recipes/recipes-page.component').then((m) => m.RecipesPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'menu',
        loadComponent: () => import('./features/menu/menu-page.component').then((m) => m.MenuPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO'] }
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions-page.component').then((m) => m.TransactionsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE', 'BARTENDER'] }
      },
      {
        path: 'stock',
        loadComponent: () => import('./features/stock/stock-page.component').then((m) => m.StockPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE', 'BARTENDER'] }
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/users-page.component').then((m) => m.UsersPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR'] }
      },
      {
        path: 'shifts',
        loadComponent: () => import('./features/shifts/shifts-page.component').then((m) => m.ShiftsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO', 'CAJERO', 'BARTENDER'] }
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/sales/sales-page.component').then((m) => m.SalesPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE', 'BARTENDER', 'CAJERO'] }
      },
      {
        path: 'physical-counts',
        loadComponent: () => import('./features/physical-counts/physical-counts-page.component').then((m) => m.PhysicalCountsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE'] }
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports-page.component').then((m) => m.ReportsPageComponent),
        canActivate: [roleGuard],
        data: { roles: ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'] }
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
