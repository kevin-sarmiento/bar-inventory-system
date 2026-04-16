import { environment } from '../../../environments/environment';

export const API_CONFIG = {
  baseUrl: environment.apiBaseUrl,
  endpoints: {
    auth: '/api/auth',
    users: '/api/users',
    categories: '/api/categories',
    units: '/api/units',
    suppliers: '/api/suppliers',
    locations: '/api/locations',
    products: '/api/products',
    recipes: '/api/recipes',
    menuItems: '/api/menu-items',
    shifts: '/api/shifts',
    transactions: '/api/transactions',
    stockBalances: '/api/stock-balances',
    sales: '/api/sales',
    physicalCounts: '/api/physical-counts',
    reports: '/api/reports'
  }
} as const;
