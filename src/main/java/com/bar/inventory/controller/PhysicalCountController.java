package com.bar.inventory.controller;

import com.bar.inventory.dto.CreatePhysicalCountRequest;
import com.bar.inventory.model.PhysicalCount;
import com.bar.inventory.model.PhysicalCountItem;
import com.bar.inventory.service.PhysicalCountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping(path = "/api/physical-counts", produces = MediaType.APPLICATION_JSON_VALUE)
public class PhysicalCountController {
    private final PhysicalCountService service;

    public PhysicalCountController(PhysicalCountService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE')")
    public Flux<PhysicalCount> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE')")
    public Mono<PhysicalCount> findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/items")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO','GERENTE')")
    public Flux<PhysicalCountItem> findItems(@PathVariable Long id) {
        return service.findItems(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','INVENTARIO')")
    public Mono<PhysicalCount> create(@Valid @RequestBody CreatePhysicalCountRequest request) {
        return service.createCount(request);
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<Map<String, String>> close(@PathVariable Long id, @RequestParam("userId") Long userId) {
        return service.closeCount(id, userId).thenReturn(Map.of("status", "closed"));
    }
}
