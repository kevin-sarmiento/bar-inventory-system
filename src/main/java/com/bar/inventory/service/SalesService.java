package com.bar.inventory.service;

import com.bar.inventory.dto.CreateSaleRequest;
import com.bar.inventory.model.Sale;
import com.bar.inventory.model.SaleItem;
import com.bar.inventory.repository.SaleItemRepository;
import com.bar.inventory.repository.SaleRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
public class SalesService {
    private static final Set<String> ALLOWED_STATUSES = Set.of("OPEN", "PAID", "CANCELLED");

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final DatabaseClient databaseClient;

    public SalesService(SaleRepository saleRepository,
                        SaleItemRepository saleItemRepository,
                        DatabaseClient databaseClient) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
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
        Sale sale = new Sale();
        sale.setSaleNumber(request.getSaleNumber());
        sale.setSaleDatetime(request.getSaleDatetime() == null ? Instant.now() : request.getSaleDatetime());
        sale.setLocationId(request.getLocationId());
        sale.setCashierUserId(request.getCashierUserId());
        sale.setTotalAmount(request.getTotalAmount());
        sale.setStatus(request.getStatus() == null ? "PAID" : request.getStatus());
        sale.setInventoryProcessed(false);

        List<com.bar.inventory.dto.CreateSaleItemRequest> items =
                request.getItems() == null ? List.of() : request.getItems();

        return saleRepository.save(sale)
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
                    return databaseClient.sql("SELECT fn_post_sale_to_inventory(:saleId, :userId) AS txn_id")
                            .bind("saleId", saleId)
                            .bind("userId", userId == null ? 1L : userId)
                            .map((row, meta) -> row.get("txn_id", Long.class))
                            .one();
                });
    }

    private void validateSaleRequest(CreateSaleRequest request) {
        if (request.getStatus() != null && !ALLOWED_STATUSES.contains(request.getStatus())) {
            throw new IllegalArgumentException("status de venta invalido");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new IllegalArgumentException("items no puede estar vacio");
        }
        for (var item : request.getItems()) {
            boolean hasMenu = item.getMenuItemId() != null;
            boolean hasProduct = item.getProductId() != null;
            if (hasMenu == hasProduct) {
                throw new IllegalArgumentException("Cada item debe tener menuItemId o productId, pero no ambos");
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
        }
    }
}
