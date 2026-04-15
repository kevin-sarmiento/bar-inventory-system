package com.bar.inventory.repository;

import com.bar.inventory.model.WorkShift;
import org.springframework.data.r2dbc.repository.R2dbcRepository;
import reactor.core.publisher.Flux;

public interface WorkShiftRepository extends R2dbcRepository<WorkShift, Long> {
    Flux<WorkShift> findByUserIdOrderByScheduledStartDesc(Long userId);
}
