package com.bar.inventory.controller;

import com.bar.inventory.model.MenuItem;
import com.bar.inventory.service.MenuService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/menu-items", produces = MediaType.APPLICATION_JSON_VALUE)
public class MenuController {
    private final MenuService service;

    public MenuController(MenuService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Flux<MenuItem> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public Mono<MenuItem> findById(@PathVariable("id") Long id) {
        return service.findById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<MenuItem> create(@Valid @RequestBody MenuItem menuItem) {
        return service.create(menuItem);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<MenuItem> update(@PathVariable("id") Long id, @Valid @RequestBody MenuItem menuItem) {
        return service.update(id, menuItem);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Void> delete(@PathVariable("id") Long id) {
        return service.delete(id);
    }
}
