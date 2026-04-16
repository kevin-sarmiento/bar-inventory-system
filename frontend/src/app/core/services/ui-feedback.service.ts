import { Injectable, signal } from '@angular/core';

export interface UiMessage {
  title: string;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class UiFeedbackService {
  readonly messages = signal<UiMessage[]>([]);

  success(title: string, detail: string): void {
    this.push({ title, detail });
  }

  error(title: string, detail: string): void {
    this.push({ title, detail });
  }

  private push(message: UiMessage): void {
    this.messages.update((current) => [...current, message]);
    setTimeout(() => {
      this.messages.update((current) => current.filter((item) => item !== message));
    }, 3500);
  }
}
