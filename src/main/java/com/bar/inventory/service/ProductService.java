package com.bar.inventory.service;

import com.bar.inventory.model.Product;
import com.bar.inventory.repository.ProductRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final DatabaseClient databaseClient;

    public ProductService(ProductRepository productRepository, DatabaseClient databaseClient) {
        this.productRepository = productRepository;
        this.databaseClient = databaseClient;
    }

    public Flux<Product> findAll() {
        return productRepository.findAll();
    }

    public Mono<Product> findById(Long id) {
        return productRepository.findById(id);
    }

    public Mono<Product> create(Product product) {
        product.setId(null);
        return productRepository.save(product)
                .flatMap(saved -> databaseClient.sql("""
                                INSERT INTO product_units (
                                    product_id, unit_id, factor_to_base,
                                    is_purchase_unit, is_consumption_unit, is_default_unit
                                ) VALUES (%d, %d, 1, TRUE, TRUE, TRUE)
                                ON CONFLICT (product_id, unit_id) DO NOTHING
                                """.formatted(saved.getId(), saved.getBaseUnitId()))
                        .fetch()
                        .rowsUpdated()
                        .thenReturn(saved));
    }

    public Mono<Product> update(Long id, Product product) {
        return productRepository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Producto no encontrado")))
                .flatMap(existing -> {
                    existing.setSku(product.getSku());
                    existing.setName(product.getName());
                    existing.setCategoryId(product.getCategoryId());
                    existing.setBaseUnitId(product.getBaseUnitId());
                    existing.setDefaultLocationId(product.getDefaultLocationId());
                    existing.setMinStockBaseQty(product.getMinStockBaseQty());
                    existing.setBarcode(product.getBarcode());
                    existing.setActive(product.getActive());
                    existing.setNotes(product.getNotes());
                    return productRepository.save(existing);
                });
    }

    public Mono<Void> delete(Long id) {
        return productRepository.deleteById(id);
    }
}
