package com.bar.inventory.service;

import com.bar.inventory.dto.CreateTransactionRequest;
import com.bar.inventory.model.InventoryTransaction;
import com.bar.inventory.model.InventoryTransactionItem;
import com.bar.inventory.repository.InventoryTransactionItemRepository;
import com.bar.inventory.repository.InventoryTransactionRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.List;

@Service
public class InventoryTransactionService {
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "OPENING_STOCK",
            "PURCHASE",
            "SALE",
            "CONSUMPTION",
            "WASTE",
            "ADJUSTMENT_IN",
            "ADJUSTMENT_OUT",
            "TRANSFER",
            "RETURN_TO_SUPPLIER",
            "RETURN_FROM_CUSTOMER"
    );
    private static final Set<String> ALLOWED_STATUSES = Set.of("DRAFT", "POSTED", "CANCELLED");


    private final InventoryTransactionRepository repository;
    private final InventoryTransactionItemRepository itemRepository;

    public InventoryTransactionService(InventoryTransactionRepository repository,
                                       InventoryTransactionItemRepository itemRepository) {
        this.repository = repository;
        this.itemRepository = itemRepository;
    }

    public Flux<InventoryTransaction> findAll() {
        return repository.findAll();
    }

    public Mono<InventoryTransaction> findById(Long id) {
        return repository.findById(id);
    }

    public Flux<InventoryTransactionItem> findItemsByTransactionId(Long transactionId) {
        return itemRepository.findByTransactionId(transactionId);
    }

    public Mono<InventoryTransaction> create(InventoryTransaction tx) {
        tx.setId(null);
        return repository.save(tx);
    }

    public Mono<InventoryTransaction> createWithItems(CreateTransactionRequest request) {
        validateCreateRequest(request);
        InventoryTransaction tx = new InventoryTransaction();
        tx.setTransactionNumber(request.getTransactionNumber());
        tx.setTransactionType(request.getTransactionType());
        tx.setTransactionDate(request.getTransactionDate() == null ? Instant.now() : request.getTransactionDate());
        tx.setStatus(request.getStatus() == null ? "POSTED" : request.getStatus());
        tx.setCreatedBy(request.getCreatedBy());
        tx.setSourceLocationId(request.getSourceLocationId());
        tx.setTargetLocationId(request.getTargetLocationId());
        tx.setSupplierId(request.getSupplierId());
        tx.setReferenceText(request.getReferenceText());
        tx.setReason(request.getReason());

        List<com.bar.inventory.dto.CreateTransactionItemRequest> items =
                request.getItems() == null ? List.of() : request.getItems();

        return repository.save(tx)
                .flatMap(saved -> Flux.fromIterable(items)
                        .concatMap(itemReq -> {
                            InventoryTransactionItem item = new InventoryTransactionItem();
                            item.setTransactionId(saved.getId());
                            item.setProductId(itemReq.getProductId());
                            item.setUnitId(itemReq.getUnitId());
                            item.setQuantity(itemReq.getQuantity());
                            item.setUnitCost(itemReq.getUnitCost());
                            item.setLotNumber(itemReq.getLotNumber());
                            item.setExpirationDate(itemReq.getExpirationDate());
                            item.setNotes(itemReq.getNotes());
                            return itemRepository.save(item);
                        })
                        .then(Mono.just(saved)));
    }

    public Mono<InventoryTransaction> updateStatus(Long transactionId, String status) {
        if (status == null || !ALLOWED_STATUSES.contains(status)) {
            return Mono.error(new IllegalArgumentException("Estado de transaccion invalido"));
        }
        return repository.findById(transactionId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Transaccion no encontrada")))
                .flatMap(tx -> {
                    tx.setStatus(status);
                    return repository.save(tx);
                });
    }

    private void validateCreateRequest(CreateTransactionRequest request) {
        if (request.getTransactionType() == null || !ALLOWED_TYPES.contains(request.getTransactionType())) {
            throw new IllegalArgumentException("transactionType invalido");
        }
        if (request.getStatus() != null && !ALLOWED_STATUSES.contains(request.getStatus())) {
            throw new IllegalArgumentException("status invalido");
        }
        validateLocations(request);
        if ("PURCHASE".equals(request.getTransactionType()) && request.getSupplierId() == null) {
            throw new IllegalArgumentException("supplierId es obligatorio para transacciones PURCHASE");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("items no puede estar vacio");
        }
        for (var item : request.getItems()) {
            if (item.getQuantity() == null || item.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("Cada item debe tener quantity > 0");
            }
            if (item.getUnitCost() != null && item.getUnitCost().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("unitCost no puede ser negativo");
            }
        }
    }

    private void validateLocations(CreateTransactionRequest request) {
        String type = request.getTransactionType();
        Long source = request.getSourceLocationId();
        Long target = request.getTargetLocationId();
        if ("TRANSFER".equals(type)) {
            if (source == null || target == null) {
                throw new IllegalArgumentException("TRANSFER requiere sourceLocationId y targetLocationId");
            }
            if (source.equals(target)) {
                throw new IllegalArgumentException("TRANSFER requiere ubicaciones origen y destino diferentes");
            }
            return;
        }
        if (Set.of("SALE", "CONSUMPTION", "WASTE", "ADJUSTMENT_OUT", "RETURN_TO_SUPPLIER").contains(type) && source == null) {
            throw new IllegalArgumentException(type + " requiere sourceLocationId");
        }
        if (Set.of("OPENING_STOCK", "PURCHASE", "ADJUSTMENT_IN", "RETURN_FROM_CUSTOMER").contains(type) && target == null) {
            throw new IllegalArgumentException(type + " requiere targetLocationId");
        }
    }
}
