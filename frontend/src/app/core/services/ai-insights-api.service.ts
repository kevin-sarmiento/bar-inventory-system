import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_CONFIG } from '../config/api.config';
import { AiChatRequestDto, AiChatResponseDto, AiInsightsResponseDto } from '../models/ai-insights.models';
import { ApiUrlService } from './api-url.service';

@Injectable({ providedIn: 'root' })
export class AiInsightsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  getInsights(from?: string, to?: string, locationId?: number) {
    return this.http.get<AiInsightsResponseDto>(this.url('/insights'), {
      params: this.params({ from, to, locationId })
    });
  }

  sendChat(request: AiChatRequestDto) {
    return this.http.post<AiChatResponseDto>(this.url('/chat'), request);
  }

  private url(path: string): string {
    return this.apiUrl.buildUrl(`${API_CONFIG.endpoints.ai}${path}`);
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
