export interface Category {
  id: number;
  name: string;
  description?: string | null;
}

export interface CategoryPayload {
  name: string;
  description?: string | null;
}

export interface Unit {
  id: number;
  code: string;
  name: string;
  unitType: 'VOLUME' | 'WEIGHT' | 'COUNT';
}

export interface UnitPayload {
  code: string;
  name: string;
  unitType: 'VOLUME' | 'WEIGHT' | 'COUNT';
}

export interface Supplier {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface SupplierPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface Location {
  id: number;
  locationName: string;
  locationType: 'WAREHOUSE' | 'BAR' | 'KITCHEN' | 'FRIDGE' | 'AUXILIARY';
  description?: string | null;
  active?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LocationPayload {
  locationName: string;
  locationType: 'WAREHOUSE' | 'BAR' | 'KITCHEN' | 'FRIDGE' | 'AUXILIARY';
  description?: string | null;
  active?: boolean | null;
}

export interface Product {
  id: number;
  sku?: string | null;
  name: string;
  categoryId: number;
  baseUnitId: number;
  defaultLocationId?: number | null;
  minStockBaseQty: number;
  barcode?: string | null;
  active?: boolean | null;
  notes?: string | null;
}

export interface ProductPayload {
  sku?: string | null;
  name: string;
  categoryId: number;
  baseUnitId: number;
  defaultLocationId?: number | null;
  minStockBaseQty: number;
  barcode?: string | null;
  active?: boolean | null;
  notes?: string | null;
}

export interface Recipe {
  id: number;
  recipeName: string;
  description?: string | null;
  active?: boolean | null;
}

export interface RecipePayload {
  recipeName: string;
  description?: string | null;
  active?: boolean | null;
}

export interface RecipeItem {
  id: number;
  recipeId: number;
  productId: number;
  unitId: number;
  quantity: number;
}

export interface RecipeItemPayload {
  productId: number;
  unitId: number;
  quantity: number;
}

export interface MenuItem {
  id: number;
  menuName: string;
  recipeId: number;
  salePrice: number;
  active?: boolean | null;
}

export interface MenuItemPayload {
  menuName: string;
  recipeId: number;
  salePrice: number;
  active?: boolean | null;
}
