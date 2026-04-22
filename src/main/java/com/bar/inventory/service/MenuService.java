package com.bar.inventory.service;

import com.bar.inventory.model.MenuItem;
import com.bar.inventory.repository.RecipeItemRepository;
import com.bar.inventory.repository.MenuItemRepository;
import com.bar.inventory.repository.StockBalanceRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class MenuService {
    private final MenuItemRepository repository;
    private final RecipeItemRepository recipeItemRepository;
    private final StockBalanceRepository stockBalanceRepository;

    public MenuService(MenuItemRepository repository,
                       RecipeItemRepository recipeItemRepository,
                       StockBalanceRepository stockBalanceRepository) {
        this.repository = repository;
        this.recipeItemRepository = recipeItemRepository;
        this.stockBalanceRepository = stockBalanceRepository;
    }

    public Flux<MenuItem> findAll() {
        return repository.findAll();
    }

    public Mono<MenuItem> findById(Long id) {
        return repository.findById(id);
    }

    public Mono<MenuItem> create(MenuItem menuItem) {
        menuItem.setId(null);
        return validateRecipeAvailability(menuItem.getRecipeId())
                .then(repository.save(menuItem));
    }

    public Mono<MenuItem> update(Long id, MenuItem menuItem) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Item de menu no encontrado")))
                .flatMap(existing -> {
                    return validateRecipeAvailability(menuItem.getRecipeId())
                            .then(Mono.defer(() -> {
                                existing.setMenuName(menuItem.getMenuName());
                                existing.setRecipeId(menuItem.getRecipeId());
                                existing.setSalePrice(menuItem.getSalePrice());
                                existing.setActive(menuItem.getActive());
                                return repository.save(existing);
                            }));
                });
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }

    private Mono<Void> validateRecipeAvailability(Long recipeId) {
        if (recipeId == null) {
            return Mono.error(new IllegalArgumentException("recipeId es obligatorio"));
        }

        Mono<Set<Long>> recipeProductsMono = recipeItemRepository.findByRecipeId(recipeId)
                .map(item -> item.getProductId())
                .collect(Collectors.toSet());

        Mono<Map<Long, BigDecimal>> availableStockMono = stockBalanceRepository.findAll()
                .filter(balance -> balance.getQuantityBase() != null && balance.getQuantityBase().compareTo(BigDecimal.ZERO) > 0)
                .collectList()
                .map(balances -> balances.stream()
                        .collect(Collectors.groupingBy(
                                balance -> balance.getProductId(),
                                Collectors.reducing(BigDecimal.ZERO, balance -> balance.getQuantityBase(), BigDecimal::add)
                        )));

        return Mono.zip(recipeProductsMono, availableStockMono)
                .flatMap(tuple -> {
                    Set<Long> recipeProducts = tuple.getT1();
                    Map<Long, BigDecimal> availableStock = tuple.getT2();

                    if (recipeProducts.isEmpty()) {
                        return Mono.error(new IllegalStateException("No se puede agregar al menu una receta sin ingredientes"));
                    }

                    Set<Long> missingProducts = recipeProducts.stream()
                            .filter(productId -> availableStock.getOrDefault(productId, BigDecimal.ZERO).compareTo(BigDecimal.ZERO) <= 0)
                            .collect(Collectors.toSet());

                    if (!missingProducts.isEmpty()) {
                        return Mono.error(new IllegalStateException("No se puede agregar al menu una receta con productos faltantes"));
                    }

                    return Mono.empty();
                });
    }
}
