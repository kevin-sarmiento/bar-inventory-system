package com.bar.inventory.controller;

import com.bar.inventory.dto.CreateSaleRequest;
import com.bar.inventory.model.Sale;
import com.bar.inventory.model.SaleItem;
import com.bar.inventory.service.SalesService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping(path = "/api/sales", produces = MediaType.APPLICATION_JSON_VALUE)
public class SalesController {
    private final SalesService service;

    public SalesController(SalesService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER','CAJERO')")
    public Flux<Sale> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER','CAJERO')")
    public Mono<Sale> findById(@PathVariable("id") Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER','CAJERO')")
    public Flux<SaleItem> findItems(@PathVariable("id") Long id) {
        return service.findItems(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','CAJERO','BARTENDER')")
    public Mono<Sale> create(@Valid @RequestBody CreateSaleRequest request) {
        return service.createSale(request);
    }

    @PostMapping("/{id}/post-inventory")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<Map<String, Long>> postInventory(@PathVariable("id") Long id, @RequestParam(value = "userId", required = false) Long userId) {
        return service.postToInventory(id, userId).map(txnId -> Map.of("transactionId", txnId));
    }
}
