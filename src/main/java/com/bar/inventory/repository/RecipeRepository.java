package com.bar.inventory.repository;

import com.bar.inventory.model.Recipe;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface RecipeRepository extends R2dbcRepository<Recipe, Long> {
}
