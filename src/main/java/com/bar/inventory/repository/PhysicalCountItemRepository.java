package com.bar.inventory.repository;

import com.bar.inventory.model.PhysicalCountItem;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

public interface PhysicalCountItemRepository extends R2dbcRepository<PhysicalCountItem, Long> {
    Flux<PhysicalCountItem> findByPhysicalCountId(Long physicalCountId);
}
