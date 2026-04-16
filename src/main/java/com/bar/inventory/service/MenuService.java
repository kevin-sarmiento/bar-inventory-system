package com.bar.inventory.service;

import com.bar.inventory.model.MenuItem;
import com.bar.inventory.repository.MenuItemRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class MenuService {
    private final MenuItemRepository repository;

    public MenuService(MenuItemRepository repository) {
        this.repository = repository;
    }

    public Flux<MenuItem> findAll() {
        return repository.findAll();
    }

    public Mono<MenuItem> findById(Long id) {
        return repository.findById(id);
    }

    public Mono<MenuItem> create(MenuItem menuItem) {
        menuItem.setId(null);
        return repository.save(menuItem);
    }

    public Mono<MenuItem> update(Long id, MenuItem menuItem) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Item de menu no encontrado")))
                .flatMap(existing -> {
                    existing.setMenuName(menuItem.getMenuName());
                    existing.setRecipeId(menuItem.getRecipeId());
                    existing.setSalePrice(menuItem.getSalePrice());
                    existing.setActive(menuItem.getActive());
                    return repository.save(existing);
                });
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }
}
