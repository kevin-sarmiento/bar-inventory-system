import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import {
  CreatePhysicalCountPayload,
  CreateSalePayload,
  CreateShiftPayload,
  CreateTransactionPayload,
  InventoryTransaction,
  InventoryTransactionItem,
  PhysicalCount,
  PhysicalCountItem,
  Sale,
  SaleItem,
  ShiftDto,
  StockBalance
} from '../models/operations.models';
import { BaseApiService } from './base-api.service';

@Injectable({ providedIn: 'root' })
export class TransactionApiService extends BaseApiService<InventoryTransaction, CreateTransactionPayload> {
  protected override endpoint = API_CONFIG.endpoints.transactions;

  listItems(transactionId: number) {
    return this.http.get<InventoryTransactionItem[]>(this.url(`/${transactionId}/items`));
  }

  updateStatus(id: number, value: string) {
    return this.http.patch<InventoryTransaction>(this.url(`/${id}/status`), null, {
      params: new HttpParams().set('value', value)
    });
  }
}

@Injectable({ providedIn: 'root' })
export class StockApiService extends BaseApiService<StockBalance> {
  protected override endpoint = API_CONFIG.endpoints.stockBalances;
}

@Injectable({ providedIn: 'root' })
export class SalesApiService extends BaseApiService<Sale, CreateSalePayload> {
  protected override endpoint = API_CONFIG.endpoints.sales;

  listItems(saleId: number) {
    return this.http.get<SaleItem[]>(this.url(`/${saleId}/items`));
  }

  postInventory(saleId: number, userId?: number) {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId);
    }
    return this.http.post<{ transactionId: number }>(this.url(`/${saleId}/post-inventory`), null, { params });
  }
}

@Injectable({ providedIn: 'root' })
export class PhysicalCountApiService extends BaseApiService<PhysicalCount, CreatePhysicalCountPayload> {
  protected override endpoint = API_CONFIG.endpoints.physicalCounts;

  listItems(countId: number) {
    return this.http.get<PhysicalCountItem[]>(this.url(`/${countId}/items`));
  }

  closeCount(id: number, userId: number) {
    return this.http.post<{ status: string }>(this.url(`/${id}/close`), null, {
      params: new HttpParams().set('userId', userId)
    });
  }
}

@Injectable({ providedIn: 'root' })
export class ShiftApiService extends BaseApiService<ShiftDto, CreateShiftPayload> {
  protected override endpoint = API_CONFIG.endpoints.shifts;

  myShifts() {
    return this.http.get<ShiftDto[]>(this.url('/me'));
  }

  cancelShift(id: number) {
    return this.http.patch<ShiftDto>(this.url(`/${id}/cancel`), null);
  }

  checkIn(id: number) {
    return this.http.post<ShiftDto>(this.url(`/${id}/check-in`), null);
  }

  checkOut(id: number) {
    return this.http.post<ShiftDto>(this.url(`/${id}/check-out`), null);
  }

  /** Turnos del usuario en la sede, en estado programado o en curso (para asociar a una venta). */
  forSale(locationId: number) {
    return this.http.get<ShiftDto[]>(this.url('/for-sale'), {
      params: new HttpParams().set('locationId', String(locationId))
    });
  }
}
