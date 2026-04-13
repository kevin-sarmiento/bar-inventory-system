package com.bar.inventory.service;

import com.bar.inventory.model.Supplier;
import com.bar.inventory.repository.SupplierRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    public Flux<Supplier> findAll() {
        return supplierRepository.findAll();
    }

    public Mono<Supplier> findById(Long id) {
        return supplierRepository.findById(id);
    }

    public Mono<Supplier> create(Supplier supplier) {
        supplier.setId(null);
        return supplierRepository.save(supplier);
    }

    public Mono<Supplier> update(Long id, Supplier supplier) {
        return supplierRepository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Proveedor no encontrado")))
                .flatMap(existing -> {
                    supplier.setId(id);
                    return supplierRepository.save(supplier);
                });
    }

    public Mono<Void> delete(Long id) {
        return supplierRepository.deleteById(id);
    }
}
