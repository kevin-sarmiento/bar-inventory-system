package com.bar.inventory.controller;

import com.bar.inventory.model.StockBalance;
import com.bar.inventory.service.StockBalanceService;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/stock-balances", produces = MediaType.APPLICATION_JSON_VALUE)
public class StockBalanceController {
    private final StockBalanceService service;

    public StockBalanceController(StockBalanceService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER')")
    public Flux<StockBalance> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE','BARTENDER')")
    public Mono<StockBalance> findById(@PathVariable("id") Long id) {
        return service.findById(id);
    }
}
