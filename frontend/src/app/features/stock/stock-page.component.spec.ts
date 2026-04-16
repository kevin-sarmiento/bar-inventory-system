import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { StockPageComponent } from './stock-page.component';
import { StockApiService } from '../../core/services/operations-api.service';

describe('StockPageComponent', () => {
  const stockApi = jasmine.createSpyObj<StockApiService>('StockApiService', ['list']);

  beforeEach(async () => {
    stockApi.list.calls.reset();
    stockApi.list.and.returnValue(of([
      { id: 1, productId: 10, locationId: 4, lotNumber: 'L-01', expirationDate: '2026-12-31', quantityBase: 120, avgUnitCostBase: 9500 }
    ] as any));

    await TestBed.configureTestingModule({
      imports: [StockPageComponent],
      providers: [{ provide: StockApiService, useValue: stockApi }]
    }).compileComponents();
  });

  it('consulta existencias y muestra el modulo en estado operativo', () => {
    const fixture = TestBed.createComponent(StockPageComponent);
    fixture.detectChanges();

    expect(stockApi.list).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Existencias actuales');
    expect(fixture.nativeElement.textContent).toContain('Producto ID');
  });
});
