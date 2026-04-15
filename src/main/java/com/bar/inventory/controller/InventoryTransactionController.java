package com.bar.inventory.controller;

import com.bar.inventory.dto.CreateTransactionRequest;
import com.bar.inventory.model.InventoryTransaction;
import com.bar.inventory.model.InventoryTransactionItem;
import com.bar.inventory.service.InventoryTransactionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
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
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER')")
    public Flux<InventoryTransaction> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER')")
    public Mono<InventoryTransaction> findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER')")
    public Flux<InventoryTransactionItem> findItems(@PathVariable Long id) {
        return service.findItemsByTransactionId(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<InventoryTransaction> create(@Valid @RequestBody CreateTransactionRequest request) {
        return service.createWithItems(request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<InventoryTransaction> updateStatus(@PathVariable Long id, @RequestParam("value") String value) {
        return service.updateStatus(id, value);
    }
}
