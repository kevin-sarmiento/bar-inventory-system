package com.bar.inventory.controller;

import com.bar.inventory.model.InventoryTransaction;
import com.bar.inventory.service.InventoryTransactionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/transactions", produces = MediaType.APPLICATION_JSON_VALUE)
public class InventoryTransactionController {

    private final InventoryTransactionService service;

    public InventoryTransactionController(InventoryTransactionService service) {
        this.service = service;
    }

    @GetMapping
    public Flux<InventoryTransaction> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Mono<InventoryTransaction> findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<InventoryTransaction> create(@RequestBody InventoryTransaction tx) {
        return service.create(tx);
    }
}
