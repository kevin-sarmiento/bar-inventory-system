package com.bar.inventory.controller;

import com.bar.inventory.model.Recipe;
import com.bar.inventory.model.RecipeItem;
import com.bar.inventory.service.RecipeService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/recipes", produces = MediaType.APPLICATION_JSON_VALUE)
public class RecipeController {
    private final RecipeService service;

    public RecipeController(RecipeService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Flux<Recipe> findAll() {
        return service.findAllRecipes();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public Mono<Recipe> findById(@PathVariable Long id) {
        return service.findRecipeById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Recipe> create(@Valid @RequestBody Recipe recipe) {
        return service.createRecipe(recipe);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Recipe> update(@PathVariable Long id, @Valid @RequestBody Recipe recipe) {
        return service.updateRecipe(id, recipe);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Void> delete(@PathVariable Long id) {
        return service.deleteRecipe(id);
    }

    @GetMapping("/{id}/items")
    @PreAuthorize("isAuthenticated()")
    public Flux<RecipeItem> findItems(@PathVariable Long id) {
        return service.findItemsByRecipeId(id);
    }

    @PostMapping(path = "/{id}/items", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<RecipeItem> addItem(@PathVariable Long id, @Valid @RequestBody RecipeItem recipeItem) {
        return service.addRecipeItem(id, recipeItem);
    }

    @DeleteMapping("/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Void> deleteItem(@PathVariable Long itemId) {
        return service.deleteRecipeItem(itemId);
    }
}
