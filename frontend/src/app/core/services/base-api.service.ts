import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiUrlService } from './api-url.service';

@Injectable()
export abstract class BaseApiService<T, TPayload = T> {
  protected readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);
  protected abstract endpoint: string;

  list(): Observable<T[]> {
    return this.http.get<T[]>(this.url());
  }

  getById(id: number): Observable<T> {
    return this.http.get<T>(this.url(`/${id}`));
  }

  create(payload: TPayload): Observable<T> {
    return this.http.post<T>(this.url(), payload);
  }

  update(id: number, payload: TPayload): Observable<T> {
    return this.http.put<T>(this.url(`/${id}`), payload);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(this.url(`/${id}`));
  }

  protected url(path = ''): string {
    return this.apiUrl.buildUrl(`${this.endpoint}${path}`);
  }
}
