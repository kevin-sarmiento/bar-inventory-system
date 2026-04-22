import { Injectable } from '@angular/core';

export interface PantryProduct {
  name: string;
  quantity?: number | null;
}

interface WorldRecipeIngredient {
  name: string;
  aliases?: string[];
  optional?: boolean;
}

interface WorldRecipe {
  name: string;
  description: string;
  tags: string[];
  ingredients: WorldRecipeIngredient[];
}

export interface RecipeSuggestion {
  name: string;
  description: string;
  ingredients: string[];
  availableIngredients: string[];
  missingIngredients: string[];
  canPrepare: boolean;
  matchScore: number;
  requestedMatch: boolean;
}

export interface RecipeSuggestionResult {
  inventoryEmpty: boolean;
  requestQuery: string;
  exactRecipeRequested: boolean;
  message: string;
  inventorySummary: string;
  suggestions: RecipeSuggestion[];
}

/**
 * Servicio heuristico para "simular IA" sobre recetas del mundo real.
 * La interfaz publica se mantiene pequena para poder reemplazar este motor
 * por una API real de IA sin tocar la pantalla consumidora.
 */
@Injectable({ providedIn: 'root' })
export class AiRecipeRecommenderService {
  private readonly worldRecipes: WorldRecipe[] = [
    {
      name: 'Mojito',
      description: 'Coctel fresco del bar con ron blanco, limon, hierbabuena y soda.',
      tags: ['mojito', 'coctel', 'ron', 'bar', 'trago'],
      ingredients: [
        { name: 'ron blanco', aliases: ['ron'] },
        { name: 'limon', aliases: ['limones', 'jugo de limon'] },
        { name: 'menta', aliases: ['hierbabuena'] },
        { name: 'azucar', aliases: ['jarabe simple'] },
        { name: 'agua con gas', aliases: ['soda', 'agua mineral'] }
      ]
    },
    {
      name: 'Margarita clasica',
      description: 'Coctel comun de bar con tequila, limon y licor de naranja.',
      tags: ['margarita', 'coctel', 'tequila', 'bar', 'trago'],
      ingredients: [
        { name: 'tequila' },
        { name: 'limon', aliases: ['limones', 'jugo de limon'] },
        { name: 'triple sec', aliases: ['licor de naranja', 'cointreau'] },
        { name: 'sal', optional: true }
      ]
    },
    {
      name: 'Gin tonic',
      description: 'Clasico rapido del bar con gin, tonica y limon.',
      tags: ['gin tonic', 'coctel', 'gin', 'bar', 'trago'],
      ingredients: [
        { name: 'gin' },
        { name: 'agua tonica', aliases: ['tonica'] },
        { name: 'limon', aliases: ['rodaja de limon', 'limones'] }
      ]
    },
    {
      name: 'Cuba libre',
      description: 'Mezcla sencilla de ron, cola y limon muy comun en bares.',
      tags: ['cuba libre', 'ron', 'cola', 'bar', 'trago'],
      ingredients: [
        { name: 'ron', aliases: ['ron blanco', 'ron oscuro'] },
        { name: 'cola', aliases: ['coca cola', 'gaseosa cola'] },
        { name: 'limon', aliases: ['limones'] }
      ]
    },
    {
      name: 'Limonada natural',
      description: 'Bebida sin alcohol muy comun para acompanar en un bar o gastrobar.',
      tags: ['limonada', 'bebida', 'refrescante', 'bar'],
      ingredients: [
        { name: 'limon', aliases: ['limones'] },
        { name: 'agua' },
        { name: 'azucar' }
      ]
    },
    {
      name: 'Piña colada',
      description: 'Coctel tropical preparado con ron, crema de coco y pina.',
      tags: ['pina colada', 'coctel', 'ron', 'bar', 'tropical'],
      ingredients: [
        { name: 'ron blanco', aliases: ['ron'] },
        { name: 'crema de coco', aliases: ['leche de coco'] },
        { name: 'pina', aliases: ['piña', 'jugo de pina', 'jugo de piña'] },
        { name: 'hielo', optional: true }
      ]
    },
    {
      name: 'Daiquiri de fresa',
      description: 'Coctel frozen muy pedido con ron, fresa y limon.',
      tags: ['daiquiri', 'fresa', 'coctel', 'bar', 'trago'],
      ingredients: [
        { name: 'ron blanco', aliases: ['ron'] },
        { name: 'fresa', aliases: ['fresas'] },
        { name: 'limon', aliases: ['limones'] },
        { name: 'azucar', aliases: ['jarabe simple'] },
        { name: 'hielo', optional: true }
      ]
    },
    {
      name: 'Martini seco',
      description: 'Preparacion de bar con gin y vermut seco.',
      tags: ['martini', 'gin', 'vermut', 'bar', 'trago'],
      ingredients: [
        { name: 'gin' },
        { name: 'vermut seco', aliases: ['vermouth seco'] },
        { name: 'aceituna', aliases: ['oliva verde'], optional: true }
      ]
    },
    {
      name: 'Michelada',
      description: 'Bebida de bar con cerveza, limon y sal.',
      tags: ['michelada', 'cerveza', 'bar', 'bebida'],
      ingredients: [
        { name: 'cerveza' },
        { name: 'limon', aliases: ['limones'] },
        { name: 'sal' },
        { name: 'salsa inglesa', aliases: ['worcestershire'], optional: true }
      ]
    },
    {
      name: 'Nachos con queso',
      description: 'Snack rapido para bar con totopos, queso y toppings simples.',
      tags: ['nachos', 'snack', 'bar', 'queso', 'pasabocas'],
      ingredients: [
        { name: 'nachos', aliases: ['totopos', 'tortilla chips'] },
        { name: 'queso cheddar', aliases: ['queso', 'salsa de queso'] },
        { name: 'jalapenos', aliases: ['jalapeños'], optional: true }
      ]
    },
    {
      name: 'Tabla mixta de jamon y queso',
      description: 'Pasabocas sencillo de bar para compartir.',
      tags: ['tabla', 'snack', 'bar', 'jamon', 'queso', 'pasabocas'],
      ingredients: [
        { name: 'jamon' },
        { name: 'queso' },
        { name: 'galletas saladas', aliases: ['crackers', 'galletas'] }
      ]
    },
    {
      name: 'Sangria roja',
      description: 'Bebida para compartir con vino tinto, frutas y soda.',
      tags: ['sangria', 'vino', 'bar', 'bebida'],
      ingredients: [
        { name: 'vino tinto', aliases: ['vino'] },
        { name: 'naranja' },
        { name: 'limon', aliases: ['limones'] },
        { name: 'gaseosa de limon', aliases: ['sprite', 'seven up', '7up', 'soda limon'] }
      ]
    }
  ];

  getSuggestions(products: PantryProduct[], requestQuery?: string): RecipeSuggestionResult {
    const inventory = products
      .map((product) => product.name.trim())
      .filter(Boolean);
    const normalizedInventory = inventory.map((item) => this.normalize(item));
    const cleanedQuery = requestQuery?.trim() ?? '';
    const inventorySummary = this.buildInventorySummary(products);

    if (!inventory.length) {
      return {
        inventoryEmpty: true,
        requestQuery: cleanedQuery,
        exactRecipeRequested: false,
        message: 'No hay productos registrados para recomendar recetas del bar.',
        inventorySummary,
        suggestions: []
      };
    }

    if (!cleanedQuery) {
      const suggestions = this.worldRecipes
        .map((recipe) => this.evaluateRecipe(recipe, normalizedInventory, false))
        .filter((suggestion) => suggestion.matchScore > 0)
        .sort((a, b) => this.sortSuggestions(a, b))
        .slice(0, 6);

      return {
        inventoryEmpty: false,
        requestQuery: '',
        exactRecipeRequested: false,
        message: suggestions.some((item) => item.canPrepare)
          ? 'Puedes preparar esta receta del bar con los productos actuales o explorar opciones cercanas.'
          : 'No tienes coincidencias exactas, pero estas son recetas de bar cercanas.',
        inventorySummary,
        suggestions
      };
    }

    const query = this.normalize(cleanedQuery);
    const exactRecipe = this.worldRecipes.find((recipe) => this.matchesRecipeQuery(recipe, query));

    if (exactRecipe) {
      const mainSuggestion = this.evaluateRecipe(exactRecipe, normalizedInventory, true);
      const alternatives = this.worldRecipes
        .filter((recipe) => recipe.name !== exactRecipe.name)
        .filter((recipe) => recipe.tags.some((tag) => query.includes(this.normalize(tag)) || this.normalize(tag).includes(query)))
        .map((recipe) => this.evaluateRecipe(recipe, normalizedInventory, false))
        .sort((a, b) => this.sortSuggestions(a, b))
        .slice(0, 3);

      return {
        inventoryEmpty: false,
        requestQuery: cleanedQuery,
        exactRecipeRequested: true,
        message: mainSuggestion.canPrepare
          ? 'Puedes preparar esta receta con lo que tienes.'
          : `No tienes todos los ingredientes para ${exactRecipe.name}, pero estas son opciones cercanas.`,
        inventorySummary,
        suggestions: [mainSuggestion, ...alternatives]
      };
    }

    const similarSuggestions = this.worldRecipes
      .map((recipe) => ({
        recipe,
        score: this.recipeQuerySimilarity(recipe, query)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => this.evaluateRecipe(item.recipe, normalizedInventory, false));

    const fallbackSuggestions = similarSuggestions.length
      ? similarSuggestions
      : this.worldRecipes
          .map((recipe) => this.evaluateRecipe(recipe, normalizedInventory, false))
          .filter((suggestion) => suggestion.matchScore > 0)
          .sort((a, b) => this.sortSuggestions(a, b))
          .slice(0, 4);

    return {
      inventoryEmpty: false,
      requestQuery: cleanedQuery,
      exactRecipeRequested: false,
      message: similarSuggestions.length
        ? 'No encontramos esa receta exacta, pero estas alternativas similares pueden servirte.'
        : 'No se encontraron recetas similares con esa consulta, pero estas opciones cercanas aprovechan tu inventario.',
      inventorySummary,
      suggestions: fallbackSuggestions
    };
  }

  /**
   * Este resumen ayuda a la UI actual y a una futura integracion real de IA
   * a entender rapidamente con que inventario se construyo la recomendacion.
   */
  private buildInventorySummary(products: PantryProduct[]): string {
    const names = products
      .map((product) => product.name.trim())
      .filter(Boolean);

    if (!names.length) {
      return 'No hay productos registrados en el sistema.';
    }

    const preview = names.slice(0, 6).join(', ');
    const suffix = names.length > 6 ? ` y ${names.length - 6} mas` : '';
    return `Productos analizados del sistema: ${preview}${suffix}.`;
  }

  private evaluateRecipe(recipe: WorldRecipe, inventory: string[], requestedMatch: boolean): RecipeSuggestion {
    const requiredIngredients = recipe.ingredients.filter((ingredient) => !ingredient.optional);
    const availableIngredients: string[] = [];
    const missingIngredients: string[] = [];

    // Comparacion flexible para simular una IA: usa aliases y coincidencias parciales.
    for (const ingredient of requiredIngredients) {
      if (this.hasIngredient(ingredient, inventory)) {
        availableIngredients.push(ingredient.name);
      } else {
        missingIngredients.push(ingredient.name);
      }
    }

    const matchScore = requiredIngredients.length ? availableIngredients.length / requiredIngredients.length : 0;

    return {
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients.map((ingredient) => ingredient.name),
      availableIngredients,
      missingIngredients,
      canPrepare: missingIngredients.length === 0,
      matchScore,
      requestedMatch
    };
  }

  private hasIngredient(ingredient: WorldRecipeIngredient, inventory: string[]): boolean {
    const variants = [ingredient.name, ...(ingredient.aliases ?? [])].map((item) => this.normalize(item));
    return variants.some((variant) =>
      inventory.some((inventoryItem) =>
        inventoryItem === variant ||
        inventoryItem.includes(variant) ||
        variant.includes(inventoryItem) ||
        this.sharesToken(inventoryItem, variant)
      )
    );
  }

  private matchesRecipeQuery(recipe: WorldRecipe, query: string): boolean {
    const normalizedName = this.normalize(recipe.name);
    if (normalizedName.includes(query) || query.includes(normalizedName)) {
      return true;
    }
    return recipe.tags.some((tag) => {
      const normalizedTag = this.normalize(tag);
      return normalizedTag.includes(query) || query.includes(normalizedTag);
    });
  }

  private recipeQuerySimilarity(recipe: WorldRecipe, query: string): number {
    const tokens = query.split(' ').filter(Boolean);
    const pool = [recipe.name, ...recipe.tags].map((item) => this.normalize(item));
    return tokens.reduce((score, token) => {
      if (pool.some((item) => item.includes(token))) {
        return score + 2;
      }
      if (recipe.ingredients.some((ingredient) => this.normalize(ingredient.name).includes(token))) {
        return score + 1;
      }
      return score;
    }, 0);
  }

  private sharesToken(left: string, right: string): boolean {
    const leftTokens = left.split(' ').filter(Boolean);
    const rightTokens = right.split(' ').filter(Boolean);
    return leftTokens.some((token) => rightTokens.includes(token));
  }

  private sortSuggestions(a: RecipeSuggestion, b: RecipeSuggestion): number {
    if (a.canPrepare !== b.canPrepare) {
      return a.canPrepare ? -1 : 1;
    }
    if (a.requestedMatch !== b.requestedMatch) {
      return a.requestedMatch ? -1 : 1;
    }
    if (b.matchScore !== a.matchScore) {
      return b.matchScore - a.matchScore;
    }
    return a.missingIngredients.length - b.missingIngredients.length;
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
