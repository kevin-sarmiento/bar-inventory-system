package com.bar.inventory.service;

import com.bar.inventory.model.ProductCategory;
import com.bar.inventory.repository.ProductCategoryRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ProductCategoryService {

    private final ProductCategoryRepository repository;

    public ProductCategoryService(ProductCategoryRepository repository) {
        this.repository = repository;
    }

    public Flux<ProductCategory> findAll() {
        return repository.findAll();
    }

    public Mono<ProductCategory> findById(Long id) {
        return repository.findById(id);
    }

    public Mono<ProductCategory> create(ProductCategory category) {
        category.setId(null);
        return repository.save(category);
    }

    public Mono<ProductCategory> update(Long id, ProductCategory category) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Categoría no encontrada")))
                .flatMap(existing -> {
                    category.setId(id);
                    return repository.save(category);
                });
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }
}
