import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ReportsPageComponent } from './reports-page.component';
import { AuthService } from '../../core/services/auth.service';
import { DownloadService } from '../../core/services/download.service';
import { ReportApiService } from '../../core/services/report-api.service';
import { UiFeedbackService } from '../../core/services/ui-feedback.service';

describe('ReportsPageComponent', () => {
  const reportApi = jasmine.createSpyObj<ReportApiService>('ReportApiService', ['getCurrentStock', 'getMovements', 'getDailyDashboard', 'download']);
  const download = jasmine.createSpyObj<DownloadService>('DownloadService', ['save']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);
  const blob = new Blob(['demo'], { type: 'application/octet-stream' });

  function authStub(roles: string[]) {
    return {
      hasAnyRole(expected: string[]) {
        return expected.some((role) => roles.includes(role));
      }
    };
  }

  beforeEach(() => {
    reportApi.getCurrentStock.and.returnValue(of([{ productName: 'Ron Blanco', categoryName: 'Destilados', locationName: 'Barra principal', quantityBase: 20, belowMinStock: false, totalValue: 1000000 }] as any));
    reportApi.getMovements.and.returnValue(of([{ transactionNumber: 'TX-9', transactionType: 'PURCHASE', productName: 'Ron Blanco', quantityBase: 12, status: 'POSTED' }] as any));
    reportApi.getDailyDashboard.and.returnValue(of({ salesCount: 8, salesTotal: 350000, lowStockItems: 2, inventoryValue: 2400000 } as any));
    reportApi.download.and.returnValue(of(blob));
  });

  async function createComponent(roles: string[]) {
    await TestBed.configureTestingModule({
      imports: [ReportsPageComponent],
      providers: [
        { provide: AuthService, useValue: authStub(roles) },
        { provide: ReportApiService, useValue: reportApi },
        { provide: DownloadService, useValue: download },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(ReportsPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance as any };
  }

  it('oculta exportaciones gerenciales para inventario', async () => {
    const { fixture, component } = await createComponent(['INVENTARIO']);
    expect(component.canExportManagement()).toBeFalse();
    expect(fixture.nativeElement.textContent).not.toContain('Exportar turnos CSV');
    expect(fixture.nativeElement.textContent).not.toContain('Exportar auditoria');
  });

  it('muestra exportaciones gerenciales para administracion', async () => {
    const { fixture, component } = await createComponent(['ADMINISTRADOR']);
    expect(component.canExportManagement()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Exportar turnos CSV');
    expect(fixture.nativeElement.textContent).toContain('Exportar auditoria');
  });

  it('consulta datos base del panel y exporta existencias', async () => {
    const { component } = await createComponent(['GERENTE']);
    expect(reportApi.getCurrentStock).toHaveBeenCalled();
    expect(reportApi.getMovements).toHaveBeenCalled();
    expect(reportApi.getDailyDashboard).toHaveBeenCalled();

    component.exportStock();

    expect(reportApi.download).toHaveBeenCalled();
    expect(download.save).toHaveBeenCalled();
    expect(feedback.success).toHaveBeenCalledWith('Exportacion lista', 'Se descargo el reporte de existencias.');
  });
});
