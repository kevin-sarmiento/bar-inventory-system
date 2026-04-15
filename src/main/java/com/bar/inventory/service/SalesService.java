package com.bar.inventory.service;

import com.bar.inventory.dto.CreateSaleRequest;
import com.bar.inventory.model.Sale;
import com.bar.inventory.model.SaleItem;
import com.bar.inventory.repository.SaleItemRepository;
import com.bar.inventory.repository.SaleRepository;
import com.bar.inventory.repository.WorkShiftRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class SalesService {
    private static final Set<String> ALLOWED_STATUSES = Set.of("OPEN", "PAID", "CANCELLED");

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final WorkShiftRepository workShiftRepository;
    private final DatabaseClient databaseClient;

    public SalesService(SaleRepository saleRepository,
                        SaleItemRepository saleItemRepository,
                        WorkShiftRepository workShiftRepository,
                        DatabaseClient databaseClient) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.workShiftRepository = workShiftRepository;
        this.databaseClient = databaseClient;
    }

    public Flux<Sale> findAll() {
        return saleRepository.findAll();
    }

    public Mono<Sale> findById(Long id) {
        return saleRepository.findById(id);
    }

    public Flux<SaleItem> findItems(Long saleId) {
        return saleItemRepository.findBySaleId(saleId);
    }

    public Mono<Sale> createSale(CreateSaleRequest request) {
        validateSaleRequest(request);
        List<com.bar.inventory.dto.CreateSaleItemRequest> items =
                request.getItems() == null ? List.of() : request.getItems();

        return validateShiftAssignment(request)
                .then(Mono.defer(() -> {
                    Sale sale = new Sale();
                    sale.setSaleNumber(request.getSaleNumber());
                    sale.setSaleDatetime(request.getSaleDatetime() == null ? Instant.now() : request.getSaleDatetime());
                    sale.setLocationId(request.getLocationId());
                    sale.setCashierUserId(request.getCashierUserId());
                    sale.setShiftId(request.getShiftId());
                    sale.setTotalAmount(request.getTotalAmount());
                    sale.setStatus(request.getStatus() == null ? "PAID" : request.getStatus());
                    sale.setInventoryProcessed(false);
                    return saleRepository.save(sale);
                }))
                .flatMap(saved -> Flux.fromIterable(items)
                        .concatMap(itemReq -> {
                            SaleItem item = new SaleItem();
                            item.setSaleId(saved.getId());
                            item.setMenuItemId(itemReq.getMenuItemId());
                            item.setProductId(itemReq.getProductId());
                            item.setUnitId(itemReq.getUnitId());
                            item.setQuantity(itemReq.getQuantity());
                            item.setUnitPrice(itemReq.getUnitPrice());
                            return saleItemRepository.save(item);
                        })
                        .then(Mono.just(saved)))
                .flatMap(saved -> {
                    if (!request.isProcessInventory()) {
                        return Mono.just(saved);
                    }
                    if (!"PAID".equals(saved.getStatus())) {
                        return Mono.error(new IllegalArgumentException("Solo se puede postear inventario para ventas en estado PAID"));
                    }
                    return postToInventory(saved.getId(), request.getCashierUserId()).thenReturn(saved);
                });
    }

    public Mono<Long> postToInventory(Long saleId, Long userId) {
        return saleRepository.findById(saleId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Venta no encontrada")))
                .flatMap(sale -> {
                    if (!"PAID".equals(sale.getStatus())) {
                        return Mono.error(new IllegalArgumentException("La venta debe estar en estado PAID para postear inventario"));
                    }
                    if (Boolean.TRUE.equals(sale.getInventoryProcessed())) {
                        return Mono.error(new IllegalStateException("La venta ya fue procesada en inventario"));
                    }
                    long effectiveUserId = userId == null ? 1L : userId;
                    return databaseClient.sql("SELECT fn_post_sale_to_inventory(%d, %d) AS txn_id"
                                    .formatted(saleId, effectiveUserId))
                            .map((row, meta) -> row.get("txn_id", Long.class))
                            .one();
                });
    }

    private Mono<Void> validateShiftAssignment(CreateSaleRequest request) {
        if (request.getShiftId() == null) {
            return Mono.empty();
        }
        if (request.getCashierUserId() == null) {
            return Mono.error(new IllegalArgumentException("cashierUserId es obligatorio cuando se envia shiftId"));
        }
        return workShiftRepository.findById(request.getShiftId())
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                .flatMap(shift -> {
                    if (!shift.getUserId().equals(request.getCashierUserId())) {
                        return Mono.error(new IllegalArgumentException("El turno no pertenece al cashierUserId enviado"));
                    }
                    if (!shift.getLocationId().equals(request.getLocationId())) {
                        return Mono.error(new IllegalArgumentException("El turno no pertenece a la locationId enviada"));
                    }
                    if (!Set.of("SCHEDULED", "IN_PROGRESS").contains(shift.getStatus())) {
                        return Mono.error(new IllegalStateException("Solo se puede vender con turnos programados o en progreso"));
                    }
                    return Mono.empty();
                });
    }

    private void validateSaleRequest(CreateSaleRequest request) {
        if (request.getSaleNumber() == null || request.getSaleNumber().isBlank()) {
            throw new IllegalArgumentException("saleNumber es obligatorio");
        }
        if (request.getSaleDatetime() == null) {
            throw new IllegalArgumentException("saleDatetime es obligatoria");
        }
        if (request.getLocationId() == null || request.getLocationId() <= 0) {
            throw new IllegalArgumentException("locationId es obligatorio");
        }
        if (request.getCashierUserId() == null || request.getCashierUserId() <= 0) {
            throw new IllegalArgumentException("cashierUserId es obligatorio");
        }
        if (request.getTotalAmount() == null || request.getTotalAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("totalAmount no puede ser negativo");
        }
        if (request.getStatus() != null && !ALLOWED_STATUSES.contains(request.getStatus())) {
            throw new IllegalArgumentException("status de venta invalido");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("items no puede estar vacio");
        }
        HashSet<String> keys = new HashSet<>();
        BigDecimal calculatedTotal = BigDecimal.ZERO;
        for (var item : request.getItems()) {
            boolean hasMenu = item.getMenuItemId() != null;
            boolean hasProduct = item.getProductId() != null;
            if (hasMenu == hasProduct) {
                throw new IllegalArgumentException("Cada item debe tener menuItemId o productId, pero no ambos");
            }
            String itemKey = hasMenu ? "MENU:%d".formatted(item.getMenuItemId()) : "PRODUCT:%d".formatted(item.getProductId());
            if (!keys.add(itemKey)) {
                throw new IllegalArgumentException("No se permiten items duplicados en una misma venta");
            }
            if (hasProduct && item.getUnitId() == null) {
                throw new IllegalArgumentException("unitId es obligatorio cuando se vende un productId directo");
            }
            if (item.getQuantity() == null || item.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException("quantity debe ser mayor a 0");
            }
            if (item.getUnitPrice() == null || item.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("unitPrice no puede ser negativo");
            }
            calculatedTotal = calculatedTotal.add(item.getUnitPrice().multiply(item.getQuantity()));
        }
        if (calculatedTotal.compareTo(request.getTotalAmount()) != 0) {
            throw new IllegalArgumentException("totalAmount no coincide con la suma de los items");
        }
    }
}
