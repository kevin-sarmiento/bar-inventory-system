import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal
} from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchSelectOption<T> {
  value: T;
  label: string;
  secondaryLabel?: string | null;
  keywords?: string | null;
}

@Component({
  selector: 'app-search-select',
  standalone: true,
  imports: [NgFor, NgIf],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchSelectComponent),
      multi: true
    }
  ],
  template: `
    <div class="search-select" [class.is-disabled]="disabled()">
      <div class="search-select-input-wrap">
        <input
          class="input search-select-input"
          type="search"
          autocomplete="off"
          [disabled]="disabled()"
          [placeholder]="currentPlaceholder()"
          [value]="inputValue()"
          (focus)="openPanel()"
          (input)="onInput($event)"
        />
        <button
          type="button"
          class="search-select-toggle"
          [disabled]="disabled()"
          (click)="togglePanel()"
          [attr.aria-label]="isOpen() ? 'Cerrar opciones' : 'Abrir opciones'"
        >
          {{ isOpen() ? '▲' : '▼' }}
        </button>
      </div>

      <div class="search-select-panel shell-card" *ngIf="isOpen()">
        <button
          *ngIf="allowClear()"
          type="button"
          class="search-select-option search-select-option--clear"
          (mousedown)="selectOption(null, $event)"
        >
          Limpiar seleccion
        </button>

        <button
          *ngFor="let option of filteredOptions()"
          type="button"
          class="search-select-option"
          [class.is-selected]="isSelected(option)"
          (mousedown)="selectOption(option, $event)"
        >
          <span class="search-select-option-label">{{ option.label }}</span>
          <span class="search-select-option-secondary" *ngIf="option.secondaryLabel">{{ option.secondaryLabel }}</span>
        </button>

        <div class="search-select-empty" *ngIf="!filteredOptions().length">
          {{ emptyMessage() }}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-select {
      position: relative;
    }

    .search-select-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-select-input {
      padding-right: 3rem;
    }

    .search-select-toggle {
      position: absolute;
      right: 0.55rem;
      border: 0;
      background: transparent;
      color: var(--color-muted);
      font-size: 0.82rem;
      cursor: pointer;
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
    }

    .search-select-toggle:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .search-select-panel {
      position: absolute;
      z-index: 30;
      top: calc(100% + 0.45rem);
      left: 0;
      right: 0;
      max-height: 16rem;
      overflow-y: auto;
      padding: 0.35rem;
      display: grid;
      gap: 0.2rem;
    }

    .search-select-option,
    .search-select-empty {
      width: 100%;
      text-align: left;
      border: 0;
      background: transparent;
      border-radius: 12px;
      padding: 0.72rem 0.8rem;
    }

    .search-select-option {
      cursor: pointer;
      display: grid;
      gap: 0.18rem;
    }

    .search-select-option:hover,
    .search-select-option.is-selected {
      background: rgba(41, 50, 65, 0.06);
    }

    .search-select-option--clear {
      color: var(--color-danger, #ee6c4d);
      font-weight: 700;
    }

    .search-select-option-label {
      font-weight: 600;
      color: var(--color-text);
    }

    .search-select-option-secondary,
    .search-select-empty {
      color: var(--color-muted);
      font-size: 0.88rem;
    }

    .search-select-empty {
      padding: 0.9rem 0.8rem;
    }

    .is-disabled {
      opacity: 0.78;
    }

    :host-context(:root[data-theme='dark']) .search-select-option:hover,
    :host-context(:root[data-theme='dark']) .search-select-option.is-selected {
      background: rgba(255, 255, 255, 0.08);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchSelectComponent implements ControlValueAccessor {
  readonly options = input<SearchSelectOption<unknown>[]>([]);
  readonly placeholder = input('Selecciona una opcion');
  readonly searchPlaceholder = input('Buscar...');
  readonly emptyMessage = input('No hay coincidencias.');
  readonly allowClear = input(false);

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly disabled = signal(false);
  protected readonly isOpen = signal(false);
  protected readonly searchTerm = signal('');
  private readonly value = signal<unknown>(null);

  protected readonly selectedOption = computed(
    () => this.options().find((option) => Object.is(option.value, this.value())) ?? null
  );
  protected readonly filteredOptions = computed(() => {
    const q = this.searchTerm().trim().toLowerCase();
    const options = this.options();
    if (!q) {
      return options;
    }
    return options.filter((option) => {
      const haystack = [option.label, option.secondaryLabel, option.keywords].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  });
  protected readonly inputValue = computed(() => (this.isOpen() ? this.searchTerm() : (this.selectedOption()?.label ?? '')));
  protected readonly currentPlaceholder = computed(() =>
    this.isOpen() ? this.searchPlaceholder() : (this.selectedOption() ? '' : this.placeholder())
  );

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: unknown): void {
    this.value.set(value);
    this.searchTerm.set('');
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.closePanel();
    }
  }

  protected openPanel(): void {
    if (this.disabled()) {
      return;
    }
    this.searchTerm.set(this.selectedOption()?.label ?? '');
    this.isOpen.set(true);
  }

  protected closePanel(): void {
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.onTouched();
  }

  protected togglePanel(): void {
    if (this.isOpen()) {
      this.closePanel();
      return;
    }
    this.openPanel();
  }

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    if (!this.isOpen()) {
      this.isOpen.set(true);
    }
    this.searchTerm.set(value);
  }

  protected selectOption(option: SearchSelectOption<unknown> | null, event: MouseEvent): void {
    event.preventDefault();
    const nextValue = option?.value ?? null;
    this.value.set(nextValue);
    this.onChange(nextValue);
    this.closePanel();
  }

  protected isSelected(option: SearchSelectOption<unknown>): boolean {
    return Object.is(option.value, this.value());
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (!this.host.nativeElement.contains(target)) {
      this.closePanel();
    }
  }
}
