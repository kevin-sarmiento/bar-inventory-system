package com.bar.inventory.service;

import com.bar.inventory.model.Recipe;
import com.bar.inventory.model.RecipeItem;
import com.bar.inventory.repository.RecipeItemRepository;
import com.bar.inventory.repository.RecipeRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class RecipeService {
    private final RecipeRepository recipeRepository;
    private final RecipeItemRepository recipeItemRepository;

    public RecipeService(RecipeRepository recipeRepository, RecipeItemRepository recipeItemRepository) {
        this.recipeRepository = recipeRepository;
        this.recipeItemRepository = recipeItemRepository;
    }

    public Flux<Recipe> findAllRecipes() {
        return recipeRepository.findAll();
    }

    public Mono<Recipe> findRecipeById(Long id) {
        return recipeRepository.findById(id);
    }

    public Mono<Recipe> createRecipe(Recipe recipe) {
        recipe.setId(null);
        return recipeRepository.save(recipe);
    }

    public Mono<Recipe> updateRecipe(Long id, Recipe recipe) {
        return recipeRepository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Receta no encontrada")))
                .flatMap(existing -> {
                    recipe.setId(id);
                    return recipeRepository.save(recipe);
                });
    }

    public Mono<Void> deleteRecipe(Long id) {
        return recipeRepository.deleteById(id);
    }

    public Flux<RecipeItem> findItemsByRecipeId(Long recipeId) {
        return recipeItemRepository.findByRecipeId(recipeId);
    }

    public Mono<RecipeItem> addRecipeItem(Long recipeId, RecipeItem recipeItem) {
        recipeItem.setId(null);
        recipeItem.setRecipeId(recipeId);
        return recipeItemRepository.save(recipeItem);
    }

    public Mono<Void> deleteRecipeItem(Long itemId) {
        return recipeItemRepository.deleteById(itemId);
    }
}
