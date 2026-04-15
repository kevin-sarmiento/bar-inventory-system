package com.bar.inventory.repository;

import com.bar.inventory.model.SaleItem;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

public interface SaleItemRepository extends R2dbcRepository<SaleItem, Long> {
    Flux<SaleItem> findBySaleId(Long saleId);
}
