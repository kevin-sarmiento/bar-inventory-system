package com.bar.inventory.service;

import com.bar.inventory.model.InventoryTransaction;
import com.bar.inventory.repository.InventoryTransactionRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class InventoryTransactionService {

    private final InventoryTransactionRepository repository;

    public InventoryTransactionService(InventoryTransactionRepository repository) {
        this.repository = repository;
    }

    public Flux<InventoryTransaction> findAll() {
        return repository.findAll();
    }

    public Mono<InventoryTransaction> findById(Long id) {
        return repository.findById(id);
    }

    public Mono<InventoryTransaction> create(InventoryTransaction tx) {
        tx.setId(null);
        return repository.save(tx);
    }
}
