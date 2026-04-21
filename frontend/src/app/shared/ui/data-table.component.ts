import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CurrencyPipe, DatePipe, NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
import { DataColumn } from '../../core/models/api.models';

let dataTableSearchSeq = 0;

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe, CurrencyPipe],
  template: `
    <div class="table-shell shell-card">
      <div class="table-search" *ngIf="clientSearch() && rows().length">
        <div class="field field-grow">
          <label [attr.for]="searchFieldId">{{ searchLabel() }}</label>
          <input
            [id]="searchFieldId"
            class="input"
            type="search"
            [placeholder]="searchPlaceholder()"
            [value]="searchTerm()"
            (input)="onSearchInput($event)"
          />
        </div>
      </div>

      <div class="table-responsive" *ngIf="displayRows().length; else emptyState">
        <table>
          <thead>
            <tr>
              <th *ngFor="let column of columns()">{{ column.label }}</th>
              <th *ngIf="actionsVisible()">Acciones</th>
            </tr>
          </thead>

          <tbody>
            <tr *ngFor="let row of displayRows()">
              <td *ngFor="let column of columns()">
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

              <td *ngIf="actionsVisible()" class="actions">
                <button *ngIf="!hideEditAction()" type="button" class="btn btn-secondary" (click)="edit.emit(row)">{{ editLabel() }}</button>
                <button *ngIf="!hideRemoveAction()" type="button" class="btn btn-accent" (click)="remove.emit(row)">{{ removeLabel() }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <ng-template #emptyState>
      <div class="state-box" *ngIf="rows().length === 0">
        <strong>{{ emptyTitle() }}</strong>
        <p>{{ emptyDescription() }}</p>
      </div>
      <div class="state-box" *ngIf="rows().length > 0 && displayRows().length === 0">
        <strong>{{ emptyFilterTitle() }}</strong>
        <p>{{ emptyFilterDescription() }}</p>
      </div>
    </ng-template>
  `,
  styles: [`
    .table-shell {
      padding: 0.65rem;
      max-width: 100%;
      min-width: 0;
      overflow: hidden;
    }

    .table-search {
      padding: 0.5rem 0.65rem 0.85rem;
      border-bottom: 1px solid rgba(41, 50, 65, 0.08);
    }

    .table-search .field {
      margin: 0;
    }

    .field-grow {
      width: 100%;
    }

    :host-context(:root[data-theme='dark']) .table-search {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }

    .table-responsive {
      width: 100%;
      max-width: 100%;
      overflow-x: auto;
      overflow-y: visible;
      -webkit-overflow-scrolling: touch;
      border-radius: var(--radius-md, 14px);
    }

    table {
      width: 100%;
      min-width: 720px;
      border-collapse: collapse;
      table-layout: auto;
    }

    th,
    td {
      text-align: left;
      padding: 1rem;
      border-bottom: 1px solid rgba(41, 50, 65, 0.08);
      vertical-align: top;
      word-break: normal;
      overflow-wrap: break-word;
      max-width: 28rem;
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
      justify-content: center;
      border-radius: 999px;
      background: rgba(62, 180, 137, 0.14);
      color: var(--color-ocean);
      min-width: 7.5rem;
      padding: 0.5rem 0.95rem;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.15;
      text-align: center;
      white-space: nowrap;
    }

    .badge-off {
      background: rgba(238, 108, 77, 0.16);
    }

    .badge-soft {
      background: rgba(244, 211, 94, 0.22);
    }

    :host-context(:root[data-theme='dark']) .badge {
      background: rgba(62, 180, 137, 0.22);
      color: #ecfff7;
      box-shadow: inset 0 0 0 1px rgba(124, 232, 188, 0.16);
    }

    :host-context(:root[data-theme='dark']) .badge-off {
      background: rgba(238, 108, 77, 0.24);
      color: #ffe7e0;
      box-shadow: inset 0 0 0 1px rgba(255, 162, 138, 0.14);
    }

    :host-context(:root[data-theme='dark']) .badge-soft {
      background: rgba(244, 211, 94, 0.22);
      color: #fff4c9;
      box-shadow: inset 0 0 0 1px rgba(255, 227, 132, 0.14);
    }

    .actions {
      display: flex;
      gap: 0.55rem;
      flex-wrap: wrap;
      align-items: center;
      min-width: max-content;
    }

    .actions .btn {
      flex: 0 0 auto;
      min-width: 7.75rem;
      padding-inline: 1.15rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent {
  readonly rows = input.required<unknown[]>();
  readonly columns = input.required<DataColumn<any>[]>();
  readonly showActions = input(true);
  readonly hideEditAction = input(false);
  readonly hideRemoveAction = input(false);
  readonly editLabel = input('Editar');
  readonly removeLabel = input('Eliminar');
  readonly emptyTitle = input('Sin datos');
  readonly emptyDescription = input('Aun no hay registros para mostrar.');
  readonly clientSearch = input(false);
  readonly searchLabel = input('Buscar');
  readonly searchPlaceholder = input('Filtrar por texto visible en la tabla...');
  readonly emptyFilterTitle = input('Sin coincidencias');
  readonly emptyFilterDescription = input('Prueba con otro texto de busqueda.');

  readonly edit = output<any>();
  readonly remove = output<any>();

  protected readonly searchFieldId = `data-table-search-${++dataTableSearchSeq}`;
  protected readonly searchTerm = signal('');

  protected readonly displayRows = computed(() => {
    const rows = this.rows();
    const columns = this.columns();
    if (!this.clientSearch()) {
      return rows;
    }
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((row) => this.rowMatches(row, columns, q));
  });

  protected readonly actionsVisible = computed(
    () => this.showActions() && (!this.hideEditAction() || !this.hideRemoveAction())
  );

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.searchTerm.set(value);
  }

  private rowMatches(row: unknown, columns: DataColumn<any>[], q: string): boolean {
    for (const col of columns) {
      const raw = this.resolve(row, col.key);
      const haystack = this.cellSearchText(raw, col.type ?? 'text').toLowerCase();
      if (haystack.includes(q)) {
        return true;
      }
    }
    return false;
  }

  private cellSearchText(raw: string | number | boolean | null, type: string): string {
    if (raw === null || raw === undefined) {
      return '';
    }
    if (type === 'boolean') {
      return (raw ? 'activo true si' : 'inactivo false no');
    }
    return String(raw);
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
