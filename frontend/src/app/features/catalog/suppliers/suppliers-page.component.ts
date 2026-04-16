import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataColumn } from '../../../core/models/api.models';
import { Supplier, SupplierPayload } from '../../../core/models/catalog.models';
import { SupplierApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';
import { DataTableComponent } from '../../../shared/ui/data-table.component';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [ReactiveFormsModule, DataTableComponent],
  template: `
    <section class="page-stack">
      <header class="page-header"><div><span class="chip">Fase 1</span><h2 class="section-title">Proveedores</h2><p class="section-subtitle">Administra los contactos principales para compras y reposicion.</p></div></header>
      <form class="shell-card form-card" [formGroup]="form" (ngSubmit)="save()">
        <div class="form-grid two-cols">
          <div class="field"><label>Nombre</label><input class="input" formControlName="name"></div>
          <div class="field"><label>Email</label><input class="input" formControlName="email"></div>
          <div class="field"><label>Telefono</label><input class="input" formControlName="phone"></div>
          <div class="field"><label>Direccion</label><input class="input" formControlName="address"></div>
        </div>
        <div class="actions"><button class="btn btn-secondary" type="button" (click)="reset()">Limpiar</button><button class="btn btn-primary" type="submit" [disabled]="form.invalid">{{ editing() ? 'Actualizar' : 'Crear' }}</button></div>
      </form>
      <app-data-table [rows]="rows()" [columns]="columns" (edit)="edit($event)" (remove)="remove($event)" />
    </section>
  `,
  styles: [`.form-card{padding:1.25rem;display:grid;gap:1rem}.two-cols{grid-template-columns:repeat(2,minmax(0,1fr))}.actions{display:flex;justify-content:flex-end;gap:.75rem}@media (max-width:900px){.two-cols{grid-template-columns:1fr}}`],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SuppliersPageComponent implements OnInit {
  private readonly api = inject(SupplierApiService);
  private readonly fb = inject(FormBuilder);
  private readonly feedback = inject(UiFeedbackService);
  protected readonly rows = signal<Supplier[]>([]);
  protected readonly editing = signal<Supplier | null>(null);
  protected readonly columns: DataColumn<Supplier>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Telefono' },
    { key: 'address', label: 'Direccion' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: [''],
    phone: [''],
    address: ['']
  });
  ngOnInit(): void { this.load(); }
  protected save(): void {
    const raw = this.form.getRawValue();
    const payload: SupplierPayload = { name: raw.name.trim(), email: raw.email || null, phone: raw.phone || null, address: raw.address || null };
    const action$ = this.editing() ? this.api.update(this.editing()!.id, payload) : this.api.create(payload);
    action$.subscribe({ next: () => { this.feedback.success('Proveedor guardado', 'La informacion fue actualizada.'); this.reset(); this.load(); }});
  }
  protected edit(row: Supplier): void { this.editing.set(row); this.form.reset({ name: row.name, email: row.email ?? '', phone: row.phone ?? '', address: row.address ?? '' }); }
  protected reset(): void { this.editing.set(null); this.form.reset({ name: '', email: '', phone: '', address: '' }); }
  protected remove(row: Supplier): void { if (!window.confirm(`¿Eliminar proveedor "${row.name}"?`)) return; this.api.remove(row.id).subscribe({ next: () => { this.feedback.success('Proveedor eliminado', 'Registro eliminado.'); this.load(); }}); }
  private load(): void { this.api.list().subscribe((rows) => this.rows.set(rows)); }
}
