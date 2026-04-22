import { TestBed } from '@angular/core/testing';
import { AiRecipeRecommenderService } from './ai-recipe-recommender.service';

describe('AiRecipeRecommenderService', () => {
  let service: AiRecipeRecommenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AiRecipeRecommenderService);
  });

  it('recomienda recetas preparables con coincidencias completas', () => {
    const result = service.getSuggestions(
      [
        { name: 'Huevos', quantity: 6 },
        { name: 'Queso campesino', quantity: 1 },
        { name: 'Mantequilla', quantity: 1 }
      ],
      'omelette'
    );

    expect(result.exactRecipeRequested).toBeTrue();
    expect(result.suggestions[0].name).toBe('Omelette de queso');
    expect(result.suggestions[0].canPrepare).toBeTrue();
  });

  it('sugiere alternativas cercanas cuando no existe la receta exacta', () => {
    const result = service.getSuggestions(
      [
        { name: 'Pasta', quantity: 1 },
        { name: 'Tomate', quantity: 4 },
        { name: 'Ajo', quantity: 1 },
        { name: 'Aceite', quantity: 1 }
      ],
      'lasagna'
    );

    expect(result.exactRecipeRequested).toBeFalse();
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.message).toContain('opciones cercanas');
  });
});
