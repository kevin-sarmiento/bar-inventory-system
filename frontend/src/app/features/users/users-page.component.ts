import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NgFor } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { CreateUserPayload, RoleDto, UserAdmin } from '../../core/models/admin.models';
import { UserAdminApiService } from '../../core/services/admin-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 3</span>
          <h2 class="section-title">Usuarios</h2>
          <p class="section-subtitle">Crea accesos y administra los perfiles del equipo.</p>
        </div>
      </header>

      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field"><label>Usuario</label><input class="input" formControlName="username"></div>
          <div class="field"><label>Nombre completo</label><input class="input" formControlName="fullName"></div>
          <div class="field"><label>Email</label><input class="input" formControlName="email"></div>
          <div class="field"><label>Contrasena temporal</label><input class="input" type="password" formControlName="password"></div>
          <div class="field"><label>Activo</label><select class="select" formControlName="active"><option [ngValue]="true">Activo</option><option [ngValue]="false">Inactivo</option></select></div>
          <div class="field"><label>Rol principal</label><select class="select" formControlName="roleName"><option *ngFor="let role of roles()" [ngValue]="role.name">{{ role.name }}</option></select></div>
        </div>
        <div class="actions"><button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button><button class="btn btn-primary" type="submit">Crear usuario</button></div>
      </form>

      <app-data-table
        [rows]="rows()"
        [columns]="columns"
        [clientSearch]="true"
        [searchPlaceholder]="'Usuario, nombre, email, rol...'"
        [removeLabel]="'Cambiar contrasena'"
        (edit)="toggleActive($event)"
        (remove)="resetPassword($event)"
      />
    </section>
  `,
  styles: [`
    .form-card {
      padding: 1.25rem;
      display: grid;
      gap: 1rem;
    }

    .three-cols {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: .75rem;
    }

    @media (max-width: 900px) {
      .three-cols {
        grid-template-columns: 1fr;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersPageComponent implements OnInit {
  private readonly api = inject(UserAdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);
  protected readonly rows = signal<UserAdmin[]>([]);
  protected readonly roles = signal<RoleDto[]>([]);
  protected readonly columns: DataColumn<UserAdmin>[] = [
    { key: 'username', label: 'Usuario' },
    { key: 'fullName', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'active', label: 'Estado', type: 'boolean' },
    { key: 'roles', label: 'Roles' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    fullName: ['', Validators.required],
    email: [''],
    password: ['', Validators.required],
    active: [true],
    roleName: ['CAJERO', Validators.required]
  });

  ngOnInit(): void {
    this.load();
  }

  protected save(): void {
    const raw = this.form.getRawValue();
    const payload: CreateUserPayload = {
      username: raw.username,
      fullName: raw.fullName,
      email: raw.email || null,
      password: raw.password,
      active: raw.active,
      roleNames: [raw.roleName]
    };

    this.api.create(payload).subscribe({
      next: () => {
        this.feedback.success('Usuario creado', 'Nuevo usuario disponible en el sistema.');
        this.reset();
        this.load();
      }
    });
  }

  protected toggleActive(user: UserAdmin): void {
    this.api.setActive(user.id, !user.active).subscribe({
      next: () => {
        this.feedback.success('Estado actualizado', 'El estado del usuario fue actualizado.');
        this.load();
      }
    });
  }

  protected resetPassword(user: UserAdmin): void {
    const temporaryPassword = window.prompt(`Nueva contrasena temporal para ${user.username}`, 'Temp1234');
    if (!temporaryPassword) {
      return;
    }

    this.api.resetPassword(user.id, { temporaryPassword }).subscribe({
      next: () => this.feedback.success('Contrasena actualizada', 'Clave temporal restablecida.')
    });
  }

  protected reset(): void {
    this.form.reset({ username: '', fullName: '', email: '', password: '', active: true, roleName: this.roles()[0]?.name ?? 'CAJERO' });
  }

  private load(): void {
    forkJoin([this.api.list(), this.api.listRoles()]).subscribe(([rows, roles]) => {
      this.rows.set(rows);
      this.roles.set(roles);
    });
  }
}
