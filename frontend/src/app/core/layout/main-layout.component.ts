import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT, NgFor, NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { RouteMenuItem } from '../models/api.models';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgFor, NgIf],
  template: `
    <div class="shell" [class.shell-collapsed]="sidebarCollapsed()">
      <aside class="sidebar shell-card">
        <div class="brand">
          <div class="brand-mark">
            <img src="assets/brand/sake-neon.png" alt="SAKE">
          </div>
          <div class="brand-copy" *ngIf="!sidebarCollapsed()">
            <strong>SAKE</strong>
            <span>Control del bar</span>
          </div>
        </div>

        <nav class="menu">
          <a *ngFor="let item of visibleMenu()" [routerLink]="item.path" routerLinkActive="active" class="menu-item">
            <span class="menu-icon">{{ item.icon }}</span>
            <span *ngIf="!sidebarCollapsed()">{{ item.label }}</span>
          </a>
        </nav>

        <div class="sidebar-actions" [class.sidebar-actions--compact]="sidebarCollapsed()">
          <button
            class="btn btn-secondary theme-toggle"
            type="button"
            (click)="toggleTheme()"
            [attr.aria-label]="darkMode() ? 'Tema claro' : 'Tema oscuro'"
            [title]="darkMode() ? 'Tema claro' : 'Tema oscuro'"
          >
            <span class="sidebar-action-icon" aria-hidden="true">{{ themeIcon() }}</span>
            <span class="sidebar-action-text" *ngIf="!sidebarCollapsed()">{{ darkMode() ? 'Claro' : 'Oscuro' }}</span>
          </button>
          <button
            class="btn btn-secondary sidebar-toggle"
            type="button"
            (click)="toggleSidebar()"
            [attr.aria-label]="sidebarCollapsed() ? 'Expandir menu' : 'Colapsar menu'"
            [title]="sidebarCollapsed() ? 'Expandir menu' : 'Colapsar menu'"
          >
            <span class="sidebar-action-icon" aria-hidden="true">{{ sidebarIcon() }}</span>
            <span class="sidebar-action-text" *ngIf="!sidebarCollapsed()">{{ sidebarCollapsed() ? 'Expandir' : 'Colapsar' }}</span>
          </button>
        </div>
      </aside>

      <div class="content">
        <header class="topbar shell-card">
          <div>
            <p class="eyebrow">SAKE</p>
            <h1>{{ currentTitle() }}</h1>
          </div>

          <div class="topbar-actions">
            <div class="user-pill">
              <strong>{{ auth.currentUser()?.username }}</strong>
              <span>{{ auth.roles().join(' · ') }}</span>
            </div>
            <button class="btn btn-accent" type="button" (click)="logout()">Cerrar sesion</button>
          </div>
        </header>

        <main class="view fade-in">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: var(--sidebar-width) 1fr;
      min-height: 100vh;
      padding: 1rem;
      gap: 1rem;
    }

    .shell-collapsed {
      grid-template-columns: var(--sidebar-width-collapsed) 1fr;
    }

    .sidebar {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
      position: sticky;
      top: 1rem;
      height: calc(100vh - 2rem);
      overflow: auto;
    }

    .brand,
    .topbar,
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .brand {
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(41, 50, 65, 0.08);
    }

    .brand-mark {
      width: 64px;
      height: 64px;
      border-radius: 999px;
      display: grid;
      place-items: center;
      overflow: hidden;
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.6) 48%, rgba(255, 255, 255, 0) 72%);
      box-shadow:
        0 10px 24px rgba(41, 50, 65, 0.08),
        inset 0 0 0 1px rgba(255, 255, 255, 0.45);
      flex-shrink: 0;
    }

    .brand-mark img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transform: scale(1.08);
    }

    .brand-copy {
      display: grid;
    }

    .brand-copy span,
    .eyebrow,
    .user-pill span {
      color: var(--color-muted);
      font-size: 0.82rem;
    }

    .menu {
      display: grid;
      gap: 0.45rem;
      flex: 1;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.9rem 1rem;
      border-radius: 18px;
      color: var(--color-muted);
      font-weight: 600;
      text-decoration: none;
      transition: transform 180ms ease, background 220ms ease, color 220ms ease;
    }

    .menu-item:hover {
      transform: translateX(4px);
    }

    .menu-icon {
      width: 1.5rem;
      text-align: center;
      font-size: 1.05rem;
    }

    .menu-item.active {
      background: var(--menu-active-bg);
      color: var(--color-text);
    }

    .sidebar-actions {
      display: grid;
      gap: 0.75rem;
    }

    .sidebar-actions--compact {
      gap: 0.4rem;
    }

    .sidebar-actions--compact .theme-toggle,
    .sidebar-actions--compact .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 2.5rem;
      padding: 0.4rem 0.55rem;
      border-radius: 14px;
      overflow: hidden;
    }

    .sidebar-action-icon {
      font-size: 1.15rem;
      line-height: 1;
      flex-shrink: 0;
    }

    .sidebar-action-text {
      margin-left: 0.45rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .sidebar-actions:not(.sidebar-actions--compact) .theme-toggle,
    .sidebar-actions:not(.sidebar-actions--compact) .sidebar-toggle {
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .theme-toggle,
    .sidebar-toggle,
    .content {
      width: 100%;
    }

    .content {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }

    .topbar {
      padding: 1.15rem 1.35rem;
      justify-content: space-between;
      flex-wrap: wrap;
    }

    .eyebrow {
      margin: 0 0 0.3rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 700;
      color: var(--color-mint);
    }

    h1 {
      margin: 0;
      font-family: 'Sora', sans-serif;
      font-size: clamp(1.35rem, 2vw, 2rem);
    }

    .user-pill {
      display: grid;
      padding: 0.75rem 1rem;
      border-radius: 18px;
      background: var(--pill-bg);
      transition: background 220ms ease;
    }

    :host-context(:root[data-theme='dark']) .brand-mark {
      background:
        radial-gradient(circle at center, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 52%, rgba(255, 255, 255, 0) 76%);
      box-shadow:
        0 12px 26px rgba(0, 0, 0, 0.22),
        inset 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    :host-context(:root[data-theme='dark']) .brand-mark img {
      filter: brightness(1.2) saturate(1.14);
    }

    .view {
      min-width: 0;
      padding-bottom: 1rem;
    }

    @media (max-width: 1024px) {
      .shell,
      .shell-collapsed {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: static;
        height: auto;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly currentTitle = signal('Panel');
  protected readonly darkMode = signal(this.readTheme());

  private readonly menu: RouteMenuItem[] = [
    { label: 'Panel', icon: '🏝️', path: '/dashboard' },
    { label: 'Categorias', icon: '🏷️', path: '/catalog/categories', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Unidades', icon: '📏', path: '/catalog/units', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Proveedores', icon: '🚚', path: '/catalog/suppliers', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Ubicaciones', icon: '📍', path: '/catalog/locations', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Productos', icon: '🍋', path: '/catalog/products', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Recetas', icon: '🍸', path: '/recipes', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Carta', icon: '🧾', path: '/menu', roles: ['ADMINISTRADOR', 'INVENTARIO'] },
    { label: 'Transacciones', icon: '🔁', path: '/transactions', roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE', 'BARTENDER'] },
    { label: 'Existencias', icon: '📦', path: '/stock', roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE', 'BARTENDER'] },
    { label: 'Usuarios', icon: '👥', path: '/users', roles: ['ADMINISTRADOR'] },
    { label: 'Turnos', icon: '⏰', path: '/shifts', roles: ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO', 'CAJERO', 'BARTENDER'] },
    { label: 'Ventas', icon: '💵', path: '/sales', roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE', 'BARTENDER', 'CAJERO'] },
    { label: 'Conteos', icon: '📝', path: '/physical-counts', roles: ['ADMINISTRADOR', 'INVENTARIO', 'GERENTE'] },
    { label: 'Reportes', icon: '📊', path: '/reports', roles: ['ADMINISTRADOR', 'GERENTE', 'INVENTARIO'] }
  ];

  protected readonly visibleMenu = computed(() =>
    this.menu.filter((item) => !item.roles?.length || this.auth.hasAnyRole(item.roles))
  );

  constructor() {
    this.applyTheme(this.darkMode());
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      const current = this.visibleMenu().find((item) => this.router.url.startsWith(item.path));
      this.currentTitle.set(current?.label ?? 'Panel');
    });
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  protected themeIcon(): string {
    return this.darkMode() ? '\u2600' : '\u263E';
  }

  protected sidebarIcon(): string {
    return this.sidebarCollapsed() ? '\u226B' : '\u226A';
  }

  protected toggleTheme(): void {
    const nextValue = !this.darkMode();
    this.darkMode.set(nextValue);
    localStorage.setItem('sake_theme_dark', String(nextValue));
    this.applyTheme(nextValue);
  }

  protected logout(): void {
    this.auth.logout();
  }

  private readTheme(): boolean {
    return localStorage.getItem('sake_theme_dark') === 'true';
  }

  private applyTheme(dark: boolean): void {
    if (dark) {
      this.document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      this.document.documentElement.removeAttribute('data-theme');
    }
  }
}
