package com.bar.inventory.repository;

import com.bar.inventory.model.Supplier;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface SupplierRepository extends R2dbcRepository<Supplier, Long> {
}
