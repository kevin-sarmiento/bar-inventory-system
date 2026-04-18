import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { ReportApiService } from '../../core/services/report-api.service';

describe('DashboardComponent', () => {
  const reportsApi = jasmine.createSpyObj<ReportApiService>('ReportApiService', ['getDailyDashboard']);

  beforeEach(async () => {
    reportsApi.getDailyDashboard.calls.reset();
    reportsApi.getDailyDashboard.and.returnValue(of({
      reportDate: '2026-04-16',
      salesCount: 14,
      salesTotal: 680000,
      lowStockItems: 3,
      inventoryValue: 4200000,
      averageTicket: 48571
    } as any));

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: ReportApiService, useValue: reportsApi }]
    }).compileComponents();
  });

  it('carga el resumen diario en la seccion principal', () => {
    const fixture = TestBed.createComponent(DashboardComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance as any;
    expect(reportsApi.getDailyDashboard).toHaveBeenCalled();
    expect(component.summary()?.salesCount).toBe(14);
    expect(fixture.nativeElement.textContent).toContain('Resumen del dia');
    expect(fixture.nativeElement.textContent).toContain('Existencias bajas');
  });
});
