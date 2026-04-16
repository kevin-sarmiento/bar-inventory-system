import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CurrencyPipe, DatePipe, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DataColumn } from '../../core/models/api.models';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, CurrencyPipe],
  template: `
    <div class="table-shell shell-card">
      <div class="table-responsive" *ngIf="rows.length; else emptyState">
        <table>
          <thead>
            <tr>
              <th *ngFor="let column of columns">{{ column.label }}</th>
              <th *ngIf="actionsVisible">Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let row of rows">
              <td *ngFor="let column of columns">
                <ng-container [ngSwitch]="column.type ?? 'text'">
                  <span *ngSwitchCase="'boolean'" class="badge" [class.badge-off]="!asBoolean(resolve(row, column.key))">
                    {{ asBoolean(resolve(row, column.key)) ? 'Activo' : 'Inactivo' }}
                  </span>
                  <span *ngSwitchCase="'badge'" class="badge badge-soft">
                    {{ resolve(row, column.key) }}
                  </span>
                  <span *ngSwitchCase="'date'">
                    {{ asDateValue(resolve(row, column.key)) | date: 'yyyy-MM-dd HH:mm' }}
                  </span>
                  <span *ngSwitchCase="'currency'">
                    {{ asCurrencyValue(resolve(row, column.key)) | currency: 'COP' : 'symbol' : '1.0-0' }}
                  </span>
                  <span *ngSwitchDefault>{{ resolve(row, column.key) }}</span>
                </ng-container>
              </td>

              <td *ngIf="actionsVisible" class="actions">
                <button *ngIf="!hideEditAction" type="button" class="btn btn-secondary" (click)="edit.emit(row)">{{ editLabel }}</button>
                <button *ngIf="!hideRemoveAction" type="button" class="btn btn-accent" (click)="remove.emit(row)">{{ removeLabel }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ng-template #emptyState>
      <div class="state-box">
        <strong>{{ emptyTitle }}</strong>
        <p>{{ emptyDescription }}</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .table-shell {
      padding: 0.65rem;
      overflow: hidden;
    }

    .table-responsive {
      overflow: auto;
    }

    table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
    }

    th,
    td {
      text-align: left;
      padding: 1rem;
      border-bottom: 1px solid rgba(41, 50, 65, 0.08);
      vertical-align: middle;
    }

    th {
      color: var(--color-muted);
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: rgba(62, 180, 137, 0.14);
      color: var(--color-ocean);
      padding: 0.4rem 0.75rem;
      font-size: 0.82rem;
      font-weight: 700;
    }

    .badge-off {
      background: rgba(238, 108, 77, 0.16);
    }

    .badge-soft {
      background: rgba(244, 211, 94, 0.22);
    }

    .actions {
      display: flex;
      gap: 0.55rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent {
  @Input({ required: true }) rows: unknown[] = [];
  @Input({ required: true }) columns: DataColumn<any>[] = [];
  @Input() showActions = true;
  @Input() hideEditAction = false;
  @Input() hideRemoveAction = false;
  @Input() editLabel = 'Editar';
  @Input() removeLabel = 'Eliminar';
  @Input() emptyTitle = 'Sin datos';
  @Input() emptyDescription = 'Aun no hay registros para mostrar.';

  @Output() edit = new EventEmitter<any>();
  @Output() remove = new EventEmitter<any>();

  protected get actionsVisible(): boolean {
    return this.showActions && (!this.hideEditAction || !this.hideRemoveAction);
  }

  protected resolve(row: unknown, key: string): string | number | boolean | null {
    if (!row || typeof row !== 'object') {
      return null;
    }
    const record = row as Record<string, unknown>;
    const value = record[key];
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return value;
    }
    return value == null ? null : String(value);
  }

  protected asBoolean(value: string | number | boolean | null): boolean {
    return Boolean(value);
  }

  protected asDateValue(value: string | number | boolean | null): string | number | null {
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  }

  protected asCurrencyValue(value: string | number | boolean | null): string | number | null {
    return typeof value === 'string' || typeof value === 'number' ? value : null;
  }
}
