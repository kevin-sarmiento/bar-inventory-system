package com.bar.inventory.controller;

import com.bar.inventory.model.UnitOfMeasure;
import com.bar.inventory.service.UnitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/units", produces = MediaType.APPLICATION_JSON_VALUE)
public class UnitController {

    private final UnitService service;

    public UnitController(UnitService service) {
        this.service = service;
    }

    @GetMapping
    public Flux<UnitOfMeasure> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Mono<UnitOfMeasure> findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<UnitOfMeasure> create(@RequestBody UnitOfMeasure unit) {
        return service.create(unit);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public Mono<UnitOfMeasure> update(@PathVariable Long id, @RequestBody UnitOfMeasure unit) {
        return service.update(id, unit);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable Long id) {
        return service.delete(id);
    }
}
