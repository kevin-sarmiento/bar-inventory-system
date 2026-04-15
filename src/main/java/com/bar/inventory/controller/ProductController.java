package com.bar.inventory.controller;

import com.bar.inventory.model.Product;
import com.bar.inventory.service.ProductService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/products", produces = MediaType.APPLICATION_JSON_VALUE)
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Flux<Product> findAll() {
        return productService.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public Mono<Product> findById(@PathVariable("id") Long id) {
        return productService.findById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Product> create(@Valid @RequestBody Product product) {
        return productService.create(product);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Product> update(@PathVariable("id") Long id, @Valid @RequestBody Product product) {
        return productService.update(id, product);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Void> delete(@PathVariable("id") Long id) {
        return productService.delete(id);
    }
}
