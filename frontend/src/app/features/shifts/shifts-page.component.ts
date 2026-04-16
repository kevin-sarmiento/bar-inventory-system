import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { DataColumn } from '../../core/models/api.models';
import { UserAdmin } from '../../core/models/admin.models';
import { Location } from '../../core/models/catalog.models';
import { CreateShiftPayload, ShiftDto } from '../../core/models/operations.models';
import { UserAdminApiService } from '../../core/services/admin-api.service';
import { AuthService } from '../../core/services/auth.service';
import { LocationApiService } from '../../core/services/catalog-api.service';
import { ShiftApiService } from '../../core/services/operations-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../shared/ui/data-table.component';

@Component({
  selector: 'app-shifts-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor, NgIf],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 3</span>
          <h2 class="section-title">Turnos</h2>
          <p class="section-subtitle">
            <ng-container *ngIf="canManage(); else ownMode">
              Programa, actualiza y controla los turnos del equipo.
            </ng-container>
            <ng-template #ownMode>
              Consulta tus turnos asignados y registra tu entrada o salida.
            </ng-template>
          </p>
        </div>
      </header>

      <form *ngIf="canManage()" class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field">
            <label>Usuario</label>
            <select class="select" formControlName="userId">
              <option *ngFor="let user of users()" [ngValue]="user.id">{{ user.fullName }}</option>
            </select>
          </div>
          <div class="field">
            <label>Ubicacion</label>
            <select class="select" formControlName="locationId">
              <option *ngFor="let item of locations()" [ngValue]="item.id">{{ item.locationName }}</option>
            </select>
          </div>
          <div class="field">
            <label>Rol</label>
            <select class="select" formControlName="roleName">
              <option value="ADMINISTRADOR">ADMINISTRADOR</option>
              <option value="GERENTE">GERENTE</option>
              <option value="INVENTARIO">INVENTARIO</option>
              <option value="CAJERO">CAJERO</option>
              <option value="BARTENDER">BARTENDER</option>
            </select>
          </div>
          <div class="field"><label>Inicio</label><input class="input" type="datetime-local" formControlName="scheduledStart"></div>
          <div class="field"><label>Fin</label><input class="input" type="datetime-local" formControlName="scheduledEnd"></div>
          <div class="field"><label>Notas</label><input class="input" formControlName="notes"></div>
        </div>
        <div class="actions">
          <button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button>
          <button class="btn btn-primary" type="submit">{{ editing() ? 'Actualizar' : 'Crear' }}</button>
        </div>
      </form>

      <app-data-table
        [rows]="rows()"
        [columns]="columns"
        [showActions]="true"
        [editLabel]="canManage() ? 'Editar' : 'Seleccionar'"
        [removeLabel]="'Cancelar'"
        [hideRemoveAction]="!canManage()"
        [emptyTitle]="'Sin turnos registrados'"
        [emptyDescription]="canManage() ? 'Cuando existan turnos apareceran aqui.' : 'Cuando tengas turnos asignados apareceran aqui.'"
        (edit)="selectShift($event)"
        (remove)="cancel($event)"
      />

      <div class="actions">
        <button class="btn btn-warning" type="button" (click)="checkInSelected()" [disabled]="!editing()">Registrar entrada</button>
        <button class="btn btn-accent" type="button" (click)="checkOutSelected()" [disabled]="!editing()">Registrar salida</button>
      </div>
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShiftsPageComponent implements OnInit {
  private readonly api = inject(ShiftApiService);
  private readonly auth = inject(AuthService);
  private readonly usersApi = inject(UserAdminApiService);
  private readonly locationsApi = inject(LocationApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);

  protected readonly canManage = computed(() => this.auth.hasAnyRole(['ADMINISTRADOR', 'GERENTE']));
  protected readonly rows = signal<ShiftDto[]>([]);
  protected readonly users = signal<UserAdmin[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly editing = signal<ShiftDto | null>(null);
  protected readonly columns: DataColumn<ShiftDto>[] = [
    { key: 'fullName', label: 'Usuario' },
    { key: 'locationName', label: 'Ubicacion' },
    { key: 'roleName', label: 'Rol', type: 'badge' },
    { key: 'scheduledStart', label: 'Inicio' },
    { key: 'scheduledEnd', label: 'Fin' },
    { key: 'status', label: 'Estado', type: 'badge' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    userId: [0, Validators.required],
    locationId: [0, Validators.required],
    roleName: ['CAJERO', Validators.required],
    scheduledStart: ['', Validators.required],
    scheduledEnd: ['', Validators.required],
    notes: ['']
  });

  ngOnInit(): void {
    this.load();
  }

  protected save(): void {
    const raw = this.form.getRawValue();
    const payload: CreateShiftPayload = {
      ...raw,
      scheduledStart: new Date(raw.scheduledStart).toISOString(),
      scheduledEnd: new Date(raw.scheduledEnd).toISOString(),
      notes: raw.notes || null
    };
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.subscribe({
      next: () => {
        this.feedback.success('Turno guardado', 'Operacion completada correctamente.');
        this.reset();
        this.loadRows();
      }
    });
  }

  protected selectShift(shift: ShiftDto): void {
    this.editing.set(shift);
    if (!this.canManage()) {
      return;
    }
    this.form.reset({
      userId: shift.userId,
      locationId: shift.locationId,
      roleName: shift.roleName,
      scheduledStart: shift.scheduledStart.slice(0, 16),
      scheduledEnd: shift.scheduledEnd.slice(0, 16),
      notes: shift.notes ?? ''
    });
  }

  protected cancel(shift: ShiftDto): void {
    this.api.cancelShift(shift.id).subscribe({
      next: () => {
        this.feedback.success('Turno cancelado', 'El turno fue cancelado correctamente.');
        this.loadRows();
      }
    });
  }

  protected checkInSelected(): void {
    if (!this.editing()) {
      return;
    }
    this.api.checkIn(this.editing()!.id).subscribe({
      next: () => {
        this.feedback.success('Entrada registrada', 'Tu entrada fue registrada correctamente.');
        this.loadRows();
      }
    });
  }

  protected checkOutSelected(): void {
    if (!this.editing()) {
      return;
    }
    this.api.checkOut(this.editing()!.id).subscribe({
      next: () => {
        this.feedback.success('Salida registrada', 'Tu salida fue registrada correctamente.');
        this.loadRows();
      }
    });
  }

  protected reset(): void {
    this.editing.set(null);
    this.form.reset({
      userId: this.users()[0]?.id ?? 0,
      locationId: this.locations()[0]?.id ?? 0,
      roleName: 'CAJERO',
      scheduledStart: '',
      scheduledEnd: '',
      notes: ''
    });
  }

  private load(): void {
    if (this.canManage()) {
      forkJoin([this.api.list(), this.usersApi.list(), this.locationsApi.list()]).subscribe(([rows, users, locations]) => {
        this.rows.set(rows);
        this.users.set(users);
        this.locations.set(locations);
        if (!this.editing()) {
          this.reset();
        }
      });
      return;
    }

    this.api.myShifts().subscribe((rows) => {
      this.rows.set(rows);
      this.editing.set(rows[0] ?? null);
    });
  }

  private loadRows(): void {
    if (this.canManage()) {
      this.api.list().subscribe((rows) => this.rows.set(rows));
      return;
    }
    this.api.myShifts().subscribe((rows) => this.rows.set(rows));
  }
}
