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
import { roleNameEs, shiftStatusEs } from '../../shared/i18n/operations-labels';
import { DataTableComponent } from '../../shared/ui/data-table.component';
import { SearchSelectComponent, SearchSelectOption } from '../../shared/ui/search-select.component';

type ShiftRow = ShiftDto & { displayStatus: string; displayRole: string };

type ShiftStatusFilter = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'MISSED';

@Component({
  selector: 'app-shifts-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent, NgFor, NgIf, SearchSelectComponent],
  template: `
    <section class="page-stack">
      <header class="page-header">
        <div>
          <span class="chip">Fase 3</span>
          <h2 class="section-title">Turnos</h2>
          <p class="section-subtitle">Programacion, entrada y salida.</p>
        </div>
      </header>

      <form *ngIf="canManage()" class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid three-cols">
          <div class="field">
            <label>Usuario</label>
            <app-search-select
              formControlName="userId"
              [options]="userOptions()"
              [placeholder]="'Selecciona un usuario'"
              [searchPlaceholder]="'Buscar usuario...'"
            />
          </div>
          <div class="field">
            <label>Ubicacion</label>
            <app-search-select
              formControlName="locationId"
              [options]="locationOptions()"
              [placeholder]="'Selecciona una ubicacion'"
              [searchPlaceholder]="'Buscar ubicacion...'"
            />
          </div>
          <div class="field">
            <label>Rol</label>
            <select class="select" formControlName="roleName">
              <option *ngFor="let r of roleOptions" [value]="r.value">{{ r.label }}</option>
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

      <div class="toolbar shell-card shifts-toolbar">
        <div class="field field-grow">
          <label for="shift-search">Buscar</label>
          <input
            id="shift-search"
            class="input"
            type="search"
            placeholder="Usuario, sede, rol, estado, notas..."
            [value]="shiftSearch()"
            (input)="shiftSearch.set($any($event.target).value)"
          />
        </div>
        <div class="field">
          <label for="shift-status-filter">Estado</label>
          <select
            id="shift-status-filter"
            class="select"
            [value]="shiftStatusFilter()"
            (change)="onShiftStatusFilter($any($event.target).value)"
          >
            <option value="ALL">Todos</option>
            <option value="SCHEDULED">Programado</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="COMPLETED">Completado</option>
            <option value="CANCELLED">Cancelado</option>
            <option value="MISSED">No asistio</option>
          </select>
        </div>
      </div>

      <h3 class="subsection-title">Turnos activos</h3>
      <app-data-table
        [rows]="activeRows()"
        [columns]="columns"
        [showActions]="true"
        [editLabel]="canManage() ? 'Editar' : 'Seleccionar'"
        [removeLabel]="'Cancelar'"
        [hideRemoveAction]="!canManage()"
        [emptyTitle]="'Sin turnos activos'"
        [emptyDescription]="''"
        (edit)="selectShift($event)"
        (remove)="cancel($event)"
      />

      <div class="actions shift-check-actions">
        <button class="btn btn-warning" type="button" (click)="checkInSelected()" [disabled]="!editing()">Registrar entrada</button>
        <button class="btn btn-accent" type="button" (click)="checkOutSelected()" [disabled]="!editing()">Registrar salida</button>
      </div>

      <h3 class="subsection-title">Turnos completados</h3>
      <app-data-table
        [rows]="completedRows()"
        [columns]="columns"
        [showActions]="false"
        [emptyTitle]="'Sin turnos completados'"
        [emptyDescription]="''"
      />

      <h3 class="subsection-title">Turnos cancelados</h3>
      <app-data-table
        [rows]="cancelledRows()"
        [columns]="columns"
        [showActions]="false"
        [emptyTitle]="'Sin turnos cancelados u omitidos'"
        [emptyDescription]="''"
      />
    </section>
  `,
  styles: [
    `.form-card{padding:1.25rem;display:grid;gap:1rem}.three-cols{grid-template-columns:repeat(3,minmax(0,1fr))}.shifts-toolbar{padding:1rem;margin-top:0.25rem;margin-bottom:0.75rem;display:flex;flex-wrap:wrap;gap:1rem;align-items:flex-end}.field-grow{flex:1;min-width:12rem}.actions{display:flex;justify-content:flex-end;gap:.75rem;flex-wrap:wrap}.shift-check-actions{margin:0.75rem 0 1rem}.subsection-title{margin:1rem 0 0.5rem;font-family:'Sora',sans-serif;font-size:1.05rem}@media (max-width:900px){.three-cols{grid-template-columns:1fr}}`
  ],
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
  protected readonly rows = signal<ShiftRow[]>([]);
  protected readonly shiftSearch = signal('');
  protected readonly shiftStatusFilter = signal<ShiftStatusFilter>('ALL');
  protected readonly activeRows = computed(() =>
    this.rows().filter((r) => this.isActiveStatus(r.status) && this.matchesShiftFilters(r))
  );
  protected readonly completedRows = computed(() =>
    this.rows().filter((r) => r.status === 'COMPLETED' && this.matchesShiftFilters(r))
  );
  protected readonly cancelledRows = computed(() =>
    this.rows().filter((r) => this.isCancelledLike(r.status) && this.matchesShiftFilters(r))
  );
  protected readonly users = signal<UserAdmin[]>([]);
  protected readonly locations = signal<Location[]>([]);
  protected readonly editing = signal<ShiftDto | null>(null);
  protected readonly userOptions = computed<SearchSelectOption<number>[]>(() =>
    this.users().map((user) => ({
      value: user.id,
      label: user.fullName,
      secondaryLabel: user.username,
      keywords: [user.email, ...(user.roles ?? [])].filter(Boolean).join(' ')
    }))
  );
  protected readonly locationOptions = computed<SearchSelectOption<number>[]>(() =>
    this.locations().map((location) => ({
      value: location.id,
      label: location.locationName,
      secondaryLabel: location.description ?? null
    }))
  );
  protected readonly roleOptions = [
    { value: 'ADMINISTRADOR', label: 'Administrador' },
    { value: 'GERENTE', label: 'Gerente' },
    { value: 'INVENTARIO', label: 'Inventario' },
    { value: 'CAJERO', label: 'Cajero' },
    { value: 'BARTENDER', label: 'Bartender' }
  ];
  protected readonly columns: DataColumn<ShiftRow>[] = [
    { key: 'fullName', label: 'Usuario' },
    { key: 'locationName', label: 'Ubicacion' },
    { key: 'displayRole', label: 'Rol', type: 'badge' },
    { key: 'scheduledStart', label: 'Inicio' },
    { key: 'scheduledEnd', label: 'Fin' },
    { key: 'displayStatus', label: 'Estado', type: 'badge' }
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

  protected onShiftStatusFilter(value: string): void {
    this.shiftStatusFilter.set(value as ShiftStatusFilter);
  }

  private isActiveStatus(status: string): boolean {
    return status === 'SCHEDULED' || status === 'IN_PROGRESS';
  }

  private isCancelledLike(status: string): boolean {
    return status === 'CANCELLED' || status === 'MISSED';
  }

  private matchesShiftFilters(row: ShiftRow): boolean {
    const sf = this.shiftStatusFilter();
    if (sf !== 'ALL' && row.status !== sf) {
      return false;
    }
    const q = this.shiftSearch().trim().toLowerCase();
    if (!q) {
      return true;
    }
    const blob = [
      row.fullName,
      row.username,
      row.locationName,
      row.displayStatus,
      row.displayRole,
      row.notes,
      String(row.id)
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return blob.includes(q);
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

  private toRows(raw: ShiftDto[]): ShiftRow[] {
    return raw.map((r) => ({
      ...r,
      displayStatus: shiftStatusEs(r.status),
      displayRole: roleNameEs(r.roleName)
    }));
  }

  private load(): void {
    if (this.canManage()) {
      forkJoin([this.api.list(), this.usersApi.list(), this.locationsApi.list()]).subscribe(([rows, users, locations]) => {
        this.rows.set(this.toRows(rows));
        this.users.set(users);
        this.locations.set(locations);
        if (!this.editing()) {
          this.reset();
        }
      });
      return;
    }

    this.api.myShifts().subscribe((rows) => {
      this.rows.set(this.toRows(rows));
      this.editing.set(rows[0] ?? null);
    });
  }

  private loadRows(): void {
    if (this.canManage()) {
      this.api.list().subscribe((rows) => this.rows.set(this.toRows(rows)));
      return;
    }
    this.api.myShifts().subscribe((rows) => {
      this.rows.set(this.toRows(rows));
    });
  }
}
