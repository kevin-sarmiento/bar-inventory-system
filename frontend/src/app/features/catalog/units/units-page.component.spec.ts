import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UnitsPageComponent } from './units-page.component';
import { UnitApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

describe('UnitsPageComponent', () => {
  const unitApi = jasmine.createSpyObj<UnitApiService>('UnitApiService', ['list', 'create', 'update', 'remove']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    unitApi.list.calls.reset();
    unitApi.create.calls.reset();
    unitApi.update.calls.reset();
    unitApi.remove.calls.reset();
    feedback.success.calls.reset();

    unitApi.list.and.returnValue(of([{ id: 1, code: 'ml', name: 'Mililitro', unitType: 'VOLUME' }] as any));
    unitApi.create.and.returnValue(of({ id: 2 } as any));
    unitApi.update.and.returnValue(of({ id: 1 } as any));
    unitApi.remove.and.returnValue(of(void 0));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [UnitsPageComponent],
      providers: [
        { provide: UnitApiService, useValue: unitApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea unidades con datos simulados', () => {
    const fixture = TestBed.createComponent(UnitsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.form.setValue({ code: 'bot', name: 'Botella', unitType: 'COUNT' });
    component.save();

    expect(unitApi.create).toHaveBeenCalledWith({ code: 'bot', name: 'Botella', unitType: 'COUNT' });
  });

  it('elimina unidades tras confirmacion', () => {
    const fixture = TestBed.createComponent(UnitsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.remove({ id: 1, name: 'Mililitro' });

    expect(unitApi.remove).toHaveBeenCalledWith(1);
  });
});
