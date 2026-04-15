package com.bar.inventory.service;

import com.bar.inventory.model.Location;
import com.bar.inventory.repository.LocationRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class LocationService {
    private final LocationRepository repository;

    public LocationService(LocationRepository repository) {
        this.repository = repository;
    }

    public Flux<Location> findAll() {
        return repository.findAll();
    }

    public Mono<Location> findById(Long id) {
        return repository.findById(id);
    }

    public Mono<Location> create(Location location) {
        location.setId(null);
        return repository.save(location);
    }

    public Mono<Location> update(Long id, Location location) {
        return repository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ubicacion no encontrada")))
                .flatMap(existing -> {
                    location.setId(id);
                    return repository.save(location);
                });
    }

    public Mono<Void> delete(Long id) {
        return repository.deleteById(id);
    }
}
