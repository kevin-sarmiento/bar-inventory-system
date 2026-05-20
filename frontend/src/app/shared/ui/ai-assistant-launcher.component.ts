import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AiChatPanelComponent, defaultChatContext } from './ai-chat-panel.component';

@Component({
  selector: 'app-ai-assistant-launcher',
  standalone: true,
  imports: [NgIf, RouterLink, AiChatPanelComponent],
  template: `
    <ng-container *ngIf="visible()">
      <button
        class="ai-fab btn btn-primary"
        type="button"
        (click)="openDrawer()"
        [attr.aria-expanded]="drawerOpen()"
        aria-controls="ai-assistant-drawer">
        <span class="ai-fab__icon" aria-hidden="true">✨</span>
        Inteligencia
      </button>

      <button
        *ngIf="drawerOpen()"
        class="ai-drawer-backdrop"
        type="button"
        aria-label="Cerrar asistente"
        (click)="closeDrawer()"></button>

      <aside
        *ngIf="drawerOpen()"
        id="ai-assistant-drawer"
        class="ai-drawer shell-card"
        role="dialog"
        aria-labelledby="ai-drawer-title"
        aria-modal="true">
        <header class="ai-drawer__head">
          <div class="ai-drawer__title-block">
            <p class="eyebrow">Copiloto IA</p>
            <h2 id="ai-drawer-title">Inteligencia</h2>
            <p class="ai-drawer__hint">Ollama + contexto del inventario (últimos 30 días)</p>
          </div>
          <div class="ai-drawer__actions">
            <a class="btn btn-secondary" routerLink="/intelligence" (click)="closeDrawer()">Vista completa</a>
            <button class="btn btn-secondary ai-drawer__close" type="button" (click)="closeDrawer()" aria-label="Cerrar">
              ✕
            </button>
          </div>
        </header>
        <app-ai-chat-panel variant="drawer" [context]="defaultContext" />
      </aside>
    </ng-container>
  `,
  styles: [`
    .ai-fab {
      position: fixed;
      right: 1.25rem;
      bottom: 1.25rem;
      z-index: 40;
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.85rem 1.15rem;
      border-radius: 999px;
      box-shadow:
        0 12px 32px rgba(41, 50, 65, 0.22),
        0 0 0 1px rgba(62, 180, 137, 0.25);
      font-weight: 700;
    }

    .ai-fab__icon {
      font-size: 1.05rem;
      line-height: 1;
    }

    .ai-drawer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 45;
      border: 0;
      background: rgba(7, 12, 18, 0.42);
      backdrop-filter: blur(4px);
    }

    .ai-drawer {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 50;
      width: min(100vw, 420px);
      height: 100vh;
      max-height: 100dvh;
      border-radius: 24px 0 0 24px;
      display: grid;
      grid-template-rows: auto 1fr;
      padding: 0;
      overflow: hidden;
      animation: drawerIn 220ms ease;
    }

    .ai-drawer__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1rem 0.75rem;
      border-bottom: 1px solid rgba(41, 50, 65, 0.08);
    }

    .ai-drawer__title-block h2 {
      margin: 0.15rem 0 0;
      font-family: 'Sora', sans-serif;
      font-size: 1.35rem;
    }

    .ai-drawer__hint {
      margin: 0.25rem 0 0;
      color: var(--color-muted);
      font-size: 0.82rem;
    }

    .eyebrow {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      font-size: 0.72rem;
      color: var(--color-mint);
    }

    .ai-drawer__actions {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
    }

    .ai-drawer__close {
      min-width: 2.5rem;
      min-height: 2.5rem;
      padding: 0.4rem;
      line-height: 1;
    }

    app-ai-chat-panel {
      min-height: 0;
    }

    @keyframes drawerIn {
      from { transform: translateX(100%); opacity: 0.6; }
      to { transform: translateX(0); opacity: 1; }
    }

    @media (max-width: 640px) {
      .ai-drawer {
        width: 100vw;
        border-radius: 0;
      }

      .ai-fab {
        right: 0.85rem;
        bottom: 0.85rem;
        padding: 0.8rem 1rem;
      }

      .ai-drawer__head {
        flex-direction: column;
        align-items: stretch;
      }

      .ai-drawer__actions {
        justify-content: space-between;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AiAssistantLauncherComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly drawerOpen = signal(false);
  protected readonly onIntelligencePage = signal(false);
  protected readonly defaultContext = defaultChatContext();

  private static readonly INTELLIGENCE_ROLES = ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'];

  protected readonly visible = computed(
    () => this.auth.hasAnyRole(AiAssistantLauncherComponent.INTELLIGENCE_ROLES) && !this.onIntelligencePage()
  );

  constructor() {
    this.syncRoute(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      const url = (event as NavigationEnd).urlAfterRedirects;
      this.syncRoute(url);
      this.drawerOpen.set(false);
    });
  }

  protected openDrawer(): void {
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.drawerOpen()) {
      this.closeDrawer();
    }
  }

  private syncRoute(url: string): void {
    this.onIntelligencePage.set(url.startsWith('/intelligence'));
  }
}
