package com.bar.inventory.repository;

import com.bar.inventory.model.PhysicalCount;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface PhysicalCountRepository extends R2dbcRepository<PhysicalCount, Long> {
}
