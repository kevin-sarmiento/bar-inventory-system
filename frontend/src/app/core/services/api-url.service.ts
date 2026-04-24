import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiUrlService {
  private readonly storageKey = 'bar_inventory_api_base_url';
  private readonly queryParamKey = 'apiBaseUrl';
  private readonly candidates = this.buildCandidates();

  getBaseUrl(): string {
    const queryValue = this.readQueryValue();
    if (queryValue) {
      const normalized = this.normalize(queryValue);
      localStorage.setItem(this.storageKey, normalized);
      return normalized;
    }

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
    const urls = [
      this.readQueryValue(),
      localStorage.getItem(this.storageKey),
      ...this.candidates
    ]
      .filter((url): url is string => Boolean(url))
      .map((url) => this.normalize(url));

    return [...new Set(urls)];
  }

  buildUrl(path: string): string {
    return `${this.getBaseUrl()}${path}`;
  }

  private buildCandidates(): string[] {
    const urls = [
      environment.apiBaseUrl,
      this.derivedTunnelBackendUrl(),
      this.sameHostBackendUrl(),
      'http://localhost:8082',
      'http://localhost:8080'
    ]
      .filter((url): url is string => Boolean(url))
      .map((url) => this.normalize(url));

    return [...new Set(urls)];
  }

  private readQueryValue(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return new URLSearchParams(window.location.search).get(this.queryParamKey);
  }

  private sameHostBackendUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const { protocol, hostname } = window.location;
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }

    return `${protocol}//${hostname}:8082`;
  }

  private derivedTunnelBackendUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const { protocol, hostname } = window.location;
    if (!hostname.includes('.devtunnels.ms')) {
      return null;
    }

    const derivedHost = hostname.replace(/-4200(?=\.)/, '-8082');
    if (derivedHost === hostname) {
      return null;
    }

    return `${protocol}//${derivedHost}`;
  }

  private normalize(url: string): string {
    return url.replace(/\/+$/, '');
  }
}
