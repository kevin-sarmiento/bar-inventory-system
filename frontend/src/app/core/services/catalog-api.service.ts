import { Injectable } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import {
  Category,
  CategoryPayload,
  Location,
  LocationPayload,
  MenuItem,
  MenuItemPayload,
  Product,
  ProductPayload,
  Recipe,
  RecipeItem,
  RecipeItemPayload,
  RecipePayload,
  Supplier,
  SupplierPayload,
  Unit,
  UnitPayload
} from '../models/catalog.models';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class CategoryApiService extends BaseApiService<Category, CategoryPayload> {
  protected override endpoint = API_CONFIG.endpoints.categories;
}

@Injectable({ providedIn: 'root' })
export class UnitApiService extends BaseApiService<Unit, UnitPayload> {
  protected override endpoint = API_CONFIG.endpoints.units;
}

@Injectable({ providedIn: 'root' })
export class SupplierApiService extends BaseApiService<Supplier, SupplierPayload> {
  protected override endpoint = API_CONFIG.endpoints.suppliers;
}

@Injectable({ providedIn: 'root' })
export class LocationApiService extends BaseApiService<Location, LocationPayload> {
  protected override endpoint = API_CONFIG.endpoints.locations;
}

@Injectable({ providedIn: 'root' })
export class ProductApiService extends BaseApiService<Product, ProductPayload> {
  protected override endpoint = API_CONFIG.endpoints.products;
}

@Injectable({ providedIn: 'root' })
export class MenuApiService extends BaseApiService<MenuItem, MenuItemPayload> {
  protected override endpoint = API_CONFIG.endpoints.menuItems;
}

@Injectable({ providedIn: 'root' })
export class RecipeApiService extends BaseApiService<Recipe, RecipePayload> {
  protected override endpoint = API_CONFIG.endpoints.recipes;

  listItems(recipeId: number) {
    return this.http.get<RecipeItem[]>(this.url(`/${recipeId}/items`));
  }

  addItem(recipeId: number, payload: RecipeItemPayload) {
    return this.http.post<RecipeItem>(this.url(`/${recipeId}/items`), payload);
  }

  removeItem(itemId: number) {
    return this.http.delete<void>(this.url(`/items/${itemId}`));
  }
}
