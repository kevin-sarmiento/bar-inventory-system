package com.bar.inventory.repository;

import com.bar.inventory.model.Location;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface LocationRepository extends R2dbcRepository<Location, Long> {
}
