package com.bar.inventory.repository;

import com.bar.inventory.model.Sale;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface SaleRepository extends R2dbcRepository<Sale, Long> {
}
