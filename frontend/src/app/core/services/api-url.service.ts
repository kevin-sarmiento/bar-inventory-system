import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private readonly storageKey = 'bar_inventory_api_base_url';
  private readonly candidates = this.buildCandidates();

  getBaseUrl(): string {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return saved;
    }
    const preferred = this.candidates[0];
    localStorage.setItem(this.storageKey, preferred);
    return preferred;
  }

  setBaseUrl(url: string): void {
    localStorage.setItem(this.storageKey, this.normalize(url));
  }

  getCandidates(): string[] {
    return [...this.candidates];
  }

  buildUrl(path: string): string {
    return `${this.getBaseUrl()}${path}`;
  }

  private buildCandidates(): string[] {
    const urls = [
      environment.apiBaseUrl,
      'http://localhost:8082',
      'http://localhost:8080'
    ]
      .filter(Boolean)
      .map((url) => this.normalize(url));

    return [...new Set(urls)];
  }

  private normalize(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
