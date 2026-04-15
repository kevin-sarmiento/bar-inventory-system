package com.bar.inventory.service;

import com.bar.inventory.dto.CreatePhysicalCountRequest;
import com.bar.inventory.model.PhysicalCount;
import com.bar.inventory.model.PhysicalCountItem;
import com.bar.inventory.repository.PhysicalCountItemRepository;
import com.bar.inventory.repository.PhysicalCountRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.HashSet;
import java.time.Instant;
import java.util.List;

@Service
public class PhysicalCountService {
    private final PhysicalCountRepository physicalCountRepository;
    private final PhysicalCountItemRepository physicalCountItemRepository;
    private final DatabaseClient databaseClient;

    public PhysicalCountService(PhysicalCountRepository physicalCountRepository,
                                PhysicalCountItemRepository physicalCountItemRepository,
                                DatabaseClient databaseClient) {
        this.physicalCountRepository = physicalCountRepository;
        this.physicalCountItemRepository = physicalCountItemRepository;
        this.databaseClient = databaseClient;
    }

    public Flux<PhysicalCount> findAll() {
        return physicalCountRepository.findAll();
    }

    public Mono<PhysicalCount> findById(Long id) {
        return physicalCountRepository.findById(id);
    }

    public Flux<PhysicalCountItem> findItems(Long physicalCountId) {
        return physicalCountItemRepository.findByPhysicalCountId(physicalCountId);
    }

    public Mono<PhysicalCount> createCount(CreatePhysicalCountRequest request) {
        validateCountRequest(request);
        PhysicalCount count = new PhysicalCount();
        count.setCountNumber(request.getCountNumber());
        count.setLocationId(request.getLocationId());
        count.setCountDate(request.getCountDate() == null ? Instant.now() : request.getCountDate());
        count.setStatus("DRAFT");
        count.setNotes(request.getNotes());
        count.setCreatedBy(request.getCreatedBy());

        List<com.bar.inventory.dto.CreatePhysicalCountItemRequest> items =
                request.getItems() == null ? List.of() : request.getItems();

        return physicalCountRepository.save(count)
                .flatMap(saved -> Flux.fromIterable(items)
                        .concatMap(itemReq -> {
                            PhysicalCountItem item = new PhysicalCountItem();
                            item.setPhysicalCountId(saved.getId());
                            item.setProductId(itemReq.getProductId());
                            item.setTheoreticalQtyBase(itemReq.getTheoreticalQtyBase());
                            item.setActualQtyBase(itemReq.getActualQtyBase());
                            item.setNotes(itemReq.getNotes());
                            return physicalCountItemRepository.save(item);
                        })
                        .then(Mono.just(saved)));
    }

    public Mono<Void> closeCount(Long physicalCountId, Long userId) {
        if (userId == null || userId <= 0) {
            return Mono.error(new IllegalArgumentException("userId invalido para cierre de conteo"));
        }
        return databaseClient.sql("SELECT fn_close_physical_count(:countId, :userId)")
                .bind("countId", physicalCountId)
                .bind("userId", userId)
                .fetch()
                .rowsUpdated()
                .then();
    }

    private void validateCountRequest(CreatePhysicalCountRequest request) {
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("items no puede estar vacio");
        }
        HashSet<Long> products = new HashSet<>();
        for (var item : request.getItems()) {
            if (item.getProductId() == null || !products.add(item.getProductId())) {
                throw new IllegalArgumentException("No se permiten productos duplicados en un mismo conteo");
            }
            if (item.getTheoreticalQtyBase() == null || item.getTheoreticalQtyBase().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("theoreticalQtyBase no puede ser negativo");
            }
            if (item.getActualQtyBase() == null || item.getActualQtyBase().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("actualQtyBase no puede ser negativo");
            }
        }
    }
}
