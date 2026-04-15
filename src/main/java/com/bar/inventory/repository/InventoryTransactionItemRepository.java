package com.bar.inventory.repository;

import com.bar.inventory.model.InventoryTransactionItem;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

public interface InventoryTransactionItemRepository extends R2dbcRepository<InventoryTransactionItem, Long> {
    Flux<InventoryTransactionItem> findByTransactionId(Long transactionId);
}
