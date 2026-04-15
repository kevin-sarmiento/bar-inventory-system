package com.bar.inventory.repository;

import com.bar.inventory.model.UnitOfMeasure;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface UnitRepository extends R2dbcRepository<UnitOfMeasure, Long> {
}
