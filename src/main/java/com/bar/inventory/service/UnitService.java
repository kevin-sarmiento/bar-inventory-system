package com.bar.inventory.service;

import com.bar.inventory.model.UnitOfMeasure;
import com.bar.inventory.repository.UnitRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class UnitService {

    private final UnitRepository repository;

    public UnitService(UnitRepository repository) {
        this.repository = repository;
    }

    public Flux<UnitOfMeasure> findAll() {
        return repository.findAll();
    }

    public Mono<UnitOfMeasure> findById(Long id) {
        return repository.findById(id);
    }

    public Mono<UnitOfMeasure> create(UnitOfMeasure unit) {
        unit.setId(null);
        applyDefaults(unit);
        return repository.save(unit);
    }

    public Mono<UnitOfMeasure> update(Long id, UnitOfMeasure unit) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Unidad no encontrada")))
                .flatMap(existing -> {
                    unit.setId(id);
                    applyDefaults(unit);
                    return repository.save(unit);
                });
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }

    private void applyDefaults(UnitOfMeasure unit) {
        if (unit.getUnitType() == null || unit.getUnitType().isBlank()) {
            unit.setUnitType("COUNT");
        }
    }
}
