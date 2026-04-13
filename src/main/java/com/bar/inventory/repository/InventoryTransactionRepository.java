package com.bar.inventory.repository;

import com.bar.inventory.model.InventoryTransaction;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface InventoryTransactionRepository extends R2dbcRepository<InventoryTransaction, Long> {
}
