package com.bar.inventory.repository;

import com.bar.inventory.model.RecipeItem;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

public interface RecipeItemRepository extends R2dbcRepository<RecipeItem, Long> {
    Flux<RecipeItem> findByRecipeId(Long recipeId);
}
