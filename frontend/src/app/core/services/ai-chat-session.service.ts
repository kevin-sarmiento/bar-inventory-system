import { Injectable, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AiChatContext } from '../models/ai-chat-context.model';
import { AiChatMessage } from '../models/ai-insights.models';
import { AiInsightsApiService } from './ai-insights-api.service';

@Injectable({ providedIn: 'root' })
export class AiChatSessionService {
  private readonly aiApi = inject(AiInsightsApiService);

  readonly messages = signal<AiChatMessage[]>([]);
  readonly loading = signal(false);

  send(message: string, useWebSearch: boolean, context: AiChatContext): void {
    const trimmed = message.trim();
    if (!trimmed || this.loading()) {
      return;
    }

    this.messages.update((items) => [...items, { role: 'user', content: trimmed }]);
    this.loading.set(true);

    this.aiApi
      .sendChat({
        message: trimmed,
        from: context.from,
        to: context.to,
        locationId: context.locationId || undefined,
        useWebSearch: useWebSearch || undefined
      })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.messages.update((items) => [
            ...items,
            {
              role: 'assistant',
              content: response.answer,
              generatedAt: response.generatedAt,
              model: response.model,
              webSearchUsed: response.webSearchUsed === true
            }
          ]);
        },
        error: (error) => {
          this.messages.update((items) => [
            ...items,
            { role: 'assistant', content: this.errorMessage(error) }
          ]);
        }
      });
  }

  private errorMessage(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const payload = (error as { error?: { error?: string } | string }).error;
      if (typeof payload === 'string') {
        return payload;
      }
      if (payload?.error) {
        return payload.error;
      }
    }
    return 'No pude conectar con Ollama. Espera a que termine de descargar el modelo o revisa el servicio local.';
  }
}
