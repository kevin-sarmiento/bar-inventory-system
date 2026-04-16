import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LocationsPageComponent } from './locations-page.component';
import { LocationApiService } from '../../../core/services/catalog-api.service';
import { UiFeedbackService } from '../../../core/services/ui-feedback.service';

describe('LocationsPageComponent', () => {
  const locationApi = jasmine.createSpyObj<LocationApiService>('LocationApiService', ['list', 'create', 'update', 'remove']);
  const feedback = jasmine.createSpyObj<UiFeedbackService>('UiFeedbackService', ['success']);

  beforeEach(async () => {
    locationApi.list.calls.reset();
    locationApi.create.calls.reset();
    locationApi.update.calls.reset();
    locationApi.remove.calls.reset();
    feedback.success.calls.reset();

    locationApi.list.and.returnValue(of([{ id: 1, locationName: 'Barra principal', locationType: 'BAR', description: 'Atencion principal', active: true }] as any));
    locationApi.create.and.returnValue(of({ id: 2 } as any));
    locationApi.update.and.returnValue(of({ id: 1 } as any));
    locationApi.remove.and.returnValue(of(void 0));
    spyOn(window, 'confirm').and.returnValue(true);

    await TestBed.configureTestingModule({
      imports: [LocationsPageComponent],
      providers: [
        { provide: LocationApiService, useValue: locationApi },
        { provide: UiFeedbackService, useValue: feedback }
      ]
    }).compileComponents();
  });

  it('crea ubicaciones con datos simulados', () => {
    const fixture = TestBed.createComponent(LocationsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.form.setValue({ locationName: 'Nevera cocteleria', locationType: 'FRIDGE', description: 'Frio de apoyo', active: true });
    component.save();

    expect(locationApi.create).toHaveBeenCalled();
  });

  it('elimina ubicaciones confirmadas', () => {
    const fixture = TestBed.createComponent(LocationsPageComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance as any;

    component.remove({ id: 1, locationName: 'Barra principal' });

    expect(locationApi.remove).toHaveBeenCalledWith(1);
  });
});
