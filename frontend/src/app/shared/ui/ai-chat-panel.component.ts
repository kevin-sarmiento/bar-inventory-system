import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  computed,
  inject,
  viewChild
} from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AiChatContext } from '../../core/models/ai-chat-context.model';
import { AuthService } from '../../core/services/auth.service';
import { AiChatSessionService } from '../../core/services/ai-chat-session.service';

@Component({
  selector: 'app-ai-chat-panel',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf, NgFor, DatePipe],
  template: `
    <section
      class="chat-panel shell-card"
      [class.chat-panel--embedded]="variant === 'embedded'"
      [class.chat-panel--drawer]="variant === 'drawer'">
      <header class="chat-panel__head">
        <div class="chat-panel__title-wrap">
          <span class="chip chip--glow">Copiloto Ollama</span>
          <h3>Pregunta sobre tu inventario</h3>
          <p>{{ bartenderAiOnly() ? 'Vista de barra: stock y vencimientos en tu área de servicio.' : 'Contexto del periodo activo. Activa búsqueda web para complementar con SearxNG.' }}</p>
        </div>
      </header>

      <div class="chat-panel__messages" #chatScroll>
        <div class="chat-empty" *ngIf="!chat.messages().length && !chat.loading()">
          <div class="chat-empty__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48"><path fill="currentColor" opacity="0.9" d="M24 4a16 16 0 100 32 32 0 01-16-16zm0 6l-8 8h5v10h6V18h5l-8-8z"/></svg>
          </div>
          <p>Empieza con una pregunta o elige una sugerencia:</p>
          <div class="chat-suggestions">
            <button
              type="button"
              class="chat-suggestion"
              *ngFor="let suggestion of suggestions()"
              (click)="applySuggestion(suggestion)">
              {{ suggestion }}
            </button>
          </div>
        </div>

        <div
          class="chat-row"
          *ngFor="let message of chat.messages()"
          [class.chat-row--user]="message.role === 'user'">
          <div
            class="chat-avatar"
            [class.chat-avatar--user]="message.role === 'user'"
            [class.chat-avatar--ai]="message.role === 'assistant'"
            aria-hidden="true">
            {{ message.role === 'user' ? 'Tú' : 'AI' }}
          </div>
          <div class="chat-bubble">
            <p>{{ message.content }}</p>
            <footer class="chat-bubble__meta" *ngIf="message.role === 'assistant'">
              <span *ngIf="message.model">{{ message.model }}</span>
              <span *ngIf="message.generatedAt">{{ message.generatedAt | date: 'short' }}</span>
              <span class="chat-bubble__web" *ngIf="message.webSearchUsed">Incluye búsqueda web</span>
            </footer>
          </div>
        </div>

        <div class="chat-row chat-row--typing" *ngIf="chat.loading()">
          <div class="chat-avatar chat-avatar--ai" aria-hidden="true">AI</div>
          <div class="chat-bubble chat-bubble--typing">
            <div class="typing-dots" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <span>Analizando con Ollama…</span>
          </div>
        </div>
      </div>

      <form class="chat-composer" [formGroup]="form" (ngSubmit)="submit()">
        <textarea
          class="input chat-composer__input"
          rows="2"
          formControlName="message"
          placeholder="Escribe tu pregunta…"
          [disabled]="chat.loading()"></textarea>
        <div class="chat-composer__footer">
          <label class="switch" *ngIf="!bartenderAiOnly()">
            <input type="checkbox" formControlName="useWebSearch" [disabled]="chat.loading()" />
            <span class="switch__track" aria-hidden="true"><span class="switch__thumb"></span></span>
            <span class="switch__label">Buscar en la web (SearxNG)</span>
          </label>
          <button class="btn btn-primary chat-composer__send" type="submit" [disabled]="chat.loading()">
            {{ chat.loading() ? 'Enviando…' : 'Enviar' }}
          </button>
        </div>
      </form>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 0;
    }

    .chat-panel {
      display: grid;
      grid-template-rows: auto 1fr auto;
      min-height: 0;
      padding: 0;
      overflow: hidden;
      background:
        linear-gradient(180deg, rgba(62, 180, 137, 0.06), transparent 22%),
        var(--color-surface);
      box-shadow:
        0 0 0 1px rgba(62, 180, 137, 0.12),
        var(--shadow-card);
    }

    .chat-panel--embedded {
      position: sticky;
      top: 5.5rem;
      min-height: min(78vh, 720px);
      max-height: calc(100vh - 6rem);
    }

    .chat-panel--drawer {
      border: 0;
      box-shadow: none;
      height: 100%;
      max-height: none;
    }

    .chat-panel__head {
      padding: 1.1rem 1.15rem 0.85rem;
      border-bottom: 1px solid rgba(41, 50, 65, 0.08);
    }

    .chat-panel__head h3 {
      margin: 0.35rem 0 0;
      font-family: 'Sora', sans-serif;
      font-size: 1.15rem;
    }

    .chat-panel__head p {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.86rem;
    }

    .chip--glow {
      width: fit-content;
      background: linear-gradient(135deg, rgba(62, 180, 137, 0.18), rgba(244, 211, 94, 0.16));
      border-color: rgba(62, 180, 137, 0.25);
    }

    .chat-panel__messages {
      padding: 0.85rem 1rem;
      overflow-y: auto;
      scroll-behavior: smooth;
      display: grid;
      align-content: start;
      gap: 0.85rem;
      min-height: 200px;
    }

    .chat-empty {
      text-align: center;
      padding: 1.5rem 0.75rem;
      display: grid;
      gap: 0.85rem;
      justify-items: center;
    }

    .chat-empty__icon {
      width: 3.5rem;
      height: 3.5rem;
      color: var(--color-mint);
      opacity: 0.85;
    }

    .chat-empty p {
      margin: 0;
      color: var(--color-muted);
      max-width: 18rem;
    }

    .chat-suggestions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      justify-content: center;
    }

    .chat-suggestion {
      border: 1px solid rgba(62, 180, 137, 0.28);
      background: rgba(62, 180, 137, 0.08);
      color: var(--color-ocean);
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 180ms ease, transform 180ms ease, border-color 180ms ease;
    }

    .chat-suggestion:hover {
      background: rgba(62, 180, 137, 0.16);
      transform: translateY(-1px);
    }

    .chat-suggestion:focus-visible {
      outline: 2px solid var(--color-mint);
      outline-offset: 2px;
    }

    .chat-row {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.55rem;
      align-items: flex-end;
    }

    .chat-row--user {
      direction: rtl;
    }

    .chat-row--user .chat-bubble,
    .chat-row--user .chat-avatar {
      direction: ltr;
    }

    .chat-avatar {
      width: 2rem;
      height: 2rem;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }

    .chat-avatar--user {
      background: linear-gradient(135deg, var(--color-mint), var(--color-ocean));
      color: #fff;
    }

    .chat-avatar--ai {
      background: linear-gradient(135deg, rgba(244, 211, 94, 0.35), rgba(62, 180, 137, 0.35));
      color: var(--color-ocean);
      border: 1px solid rgba(62, 180, 137, 0.25);
    }

    .chat-bubble {
      border-radius: 16px 16px 16px 6px;
      padding: 0.75rem 0.9rem;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(41, 50, 65, 0.1);
      display: grid;
      gap: 0.35rem;
    }

    .chat-row--user .chat-bubble {
      border-radius: 16px 16px 6px 16px;
      color: #fff;
      background: linear-gradient(135deg, var(--color-mint), var(--color-ocean));
      border-color: transparent;
    }

    .chat-bubble p {
      margin: 0;
      line-height: 1.55;
      white-space: pre-wrap;
    }

    .chat-bubble__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 0.65rem;
      font-size: 0.72rem;
      color: var(--color-muted);
    }

    .chat-row--user .chat-bubble__meta {
      color: rgba(255, 255, 255, 0.75);
    }

    .chat-bubble__web {
      font-weight: 700;
      color: var(--color-mint);
    }

    .chat-row--user .chat-bubble__web {
      color: rgba(255, 255, 255, 0.9);
    }

    .chat-bubble--typing {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: var(--color-muted);
      font-size: 0.88rem;
    }

    .typing-dots {
      display: inline-flex;
      gap: 0.22rem;
    }

    .typing-dots span {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--color-mint);
      animation: typingBounce 1.1s ease-in-out infinite;
    }

    .typing-dots span:nth-child(2) { animation-delay: 0.15s; }
    .typing-dots span:nth-child(3) { animation-delay: 0.3s; }

    .chat-composer {
      padding: 0.85rem 1rem 1rem;
      border-top: 1px solid rgba(41, 50, 65, 0.08);
      background: rgba(255, 255, 255, 0.45);
      display: grid;
      gap: 0.65rem;
    }

    .chat-composer__input {
      resize: none;
      min-height: 2.75rem;
    }

    .chat-composer__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
    }

    .chat-composer__send {
      min-width: 7.5rem;
    }

    .switch {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      cursor: pointer;
      user-select: none;
    }

    .switch input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
    }

    .switch__track {
      width: 2.65rem;
      height: 1.45rem;
      border-radius: 999px;
      background: rgba(41, 50, 65, 0.18);
      position: relative;
      transition: background 220ms ease;
    }

    .switch__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2px 6px rgba(41, 50, 65, 0.2);
      transition: transform 220ms ease;
    }

    .switch input:checked + .switch__track {
      background: linear-gradient(135deg, var(--color-mint), var(--color-ocean));
    }

    .switch input:checked + .switch__track .switch__thumb {
      transform: translateX(1.2rem);
    }

    .switch__label {
      font-size: 0.86rem;
      color: var(--color-muted);
    }

    :host-context(:root[data-theme='dark']) .chat-panel--embedded {
      box-shadow:
        0 0 0 1px rgba(62, 180, 137, 0.2),
        0 24px 56px rgba(0, 0, 0, 0.35);
    }

    :host-context(:root[data-theme='dark']) .chat-bubble {
      background: rgba(255, 255, 255, 0.06);
      border-color: rgba(255, 255, 255, 0.1);
    }

    :host-context(:root[data-theme='dark']) .chat-composer {
      background: rgba(0, 0, 0, 0.2);
    }

    :host-context(:root[data-theme='dark']) .chat-suggestion {
      color: var(--color-text);
      border-color: rgba(62, 180, 137, 0.35);
    }

    @keyframes typingBounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
      40% { transform: translateY(-4px); opacity: 1; }
    }

    @media (max-width: 1200px) {
      .chat-panel--embedded {
        position: relative;
        top: 0;
        max-height: none;
        min-height: 520px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiChatPanelComponent implements AfterViewChecked {
  protected readonly chat = inject(AiChatSessionService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly chatScrollEl = viewChild<ElementRef<HTMLElement>>('chatScroll');

  @Input() variant: 'embedded' | 'drawer' = 'embedded';
  @Input() context: AiChatContext = defaultChatContext();

  protected readonly bartenderAiOnly = this.auth.bartenderAiOnly;
  protected readonly suggestions = computed(() =>
    this.auth.bartenderAiOnly()
      ? [
          '¿Qué insumos están por agotarse en barra?',
          '¿Qué lotes debo usar primero por vencimiento?',
          '¿Qué priorizo en servicio hoy?',
          '¿Cómo hago check-in en mi turno?',
          '¿Cómo se registra una compra en el sistema?'
        ]
      : [
          '¿Qué debo comprar primero?',
          '¿Cómo registro una compra en el sistema?',
          '¿Cuáles son las alertas más urgentes?',
          '¿Qué hace el módulo de conteos físicos?'
        ]
  );

  protected readonly form = this.fb.nonNullable.group({
    message: [''],
    useWebSearch: [false]
  });

  private shouldScrollChat = false;

  ngAfterViewChecked(): void {
    if (!this.shouldScrollChat) {
      return;
    }
    this.shouldScrollChat = false;
    const el = this.chatScrollEl()?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  protected applySuggestion(text: string): void {
    this.form.patchValue({ message: text });
  }

  protected submit(): void {
    const message = this.form.controls.message.value.trim();
    if (!message || this.chat.loading()) {
      return;
    }

    const useWeb = this.form.controls.useWebSearch.value;
    this.shouldScrollChat = true;
    this.form.patchValue({ message: '' });
    this.chat.send(message, useWeb, this.context);
    this.shouldScrollChat = true;
  }
}

export function defaultChatContext(): AiChatContext {
  const today = new Date();
  const from = new Date(today);
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: today.toISOString().slice(0, 10),
    locationId: 0
  };
}
