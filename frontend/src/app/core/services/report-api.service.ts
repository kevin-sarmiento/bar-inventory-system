import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';
import {
  AuditHistoryDto,
  CountDifferenceDto,
  DashboardSummaryDto,
  InventoryValuationDto,
  MovementReportDto,
  ShiftReportDto,
  ShiftSalesByLocationDto,
  ShiftSalesByUserDto,
  StockViewDto
} from '../models/report.models';
import { ApiUrlService } from './api-url.service';

@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getCurrentStock(locationId?: number) {
    return this.http.get<StockViewDto[]>(this.url('/stock'), { params: this.params({ locationId }) });
  }

  getDailyDashboard(date?: string, locationId?: number) {
    return this.http.get<DashboardSummaryDto>(this.url('/dashboard/daily'), { params: this.params({ date, locationId }) });
  }

  getMovements(from?: string, to?: string, type?: string) {
    return this.http.get<MovementReportDto[]>(this.url('/movements'), { params: this.params({ from, to, type }) });
  }

  getWaste(from?: string, to?: string) {
    return this.http.get<MovementReportDto[]>(this.url('/waste'), { params: this.params({ from, to }) });
  }

  getConsumption(from?: string, to?: string) {
    return this.http.get<MovementReportDto[]>(this.url('/consumption'), { params: this.params({ from, to }) });
  }

  getCountDifferences() {
    return this.http.get<CountDifferenceDto[]>(this.url('/count-differences'));
  }

  getInventoryValuation() {
    return this.http.get<InventoryValuationDto[]>(this.url('/inventory-valuation'));
  }

  getAuditHistory(from?: string, to?: string) {
    return this.http.get<AuditHistoryDto[]>(this.url('/audit'), { params: this.params({ from, to }) });
  }

  getShiftSummary(from?: string, to?: string, userId?: number, locationId?: number) {
    return this.http.get<ShiftReportDto[]>(this.url('/shifts'), { params: this.params({ from, to, userId, locationId }) });
  }

  getShiftSalesByUser(from?: string, to?: string, locationId?: number) {
    return this.http.get<ShiftSalesByUserDto[]>(this.url('/shifts/by-user'), { params: this.params({ from, to, locationId }) });
  }

  getShiftSalesByLocation(from?: string, to?: string, userId?: number) {
    return this.http.get<ShiftSalesByLocationDto[]>(this.url('/shifts/by-location'), { params: this.params({ from, to, userId }) });
  }

  download(path: string, params?: Record<string, string | number | undefined>): Observable<Blob> {
    return this.http.get(this.url(path), {
      params: this.params(params),
      responseType: 'blob'
    });
  }

  private url(path: string): string {
    return this.apiUrl.buildUrl(`${API_CONFIG.endpoints.reports}${path}`);
  }

  private params(source?: Record<string, string | number | boolean | undefined | null>): HttpParams {
    let params = new HttpParams();
    Object.entries(source ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }
}
