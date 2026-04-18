package com.bar.inventory.service;

import com.bar.inventory.dto.CreateSaleRequest;
import com.bar.inventory.model.Sale;
import com.bar.inventory.model.SaleItem;
import com.bar.inventory.model.User;
import com.bar.inventory.repository.SaleItemRepository;
import com.bar.inventory.repository.SaleRepository;
import com.bar.inventory.repository.UserRepository;
import com.bar.inventory.repository.WorkShiftRepository;
import io.r2dbc.spi.Row;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.util.function.Tuple2;

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
    private final UserRepository userRepository;
    private final DatabaseClient databaseClient;

    public SalesService(SaleRepository saleRepository,
                        SaleItemRepository saleItemRepository,
                        WorkShiftRepository workShiftRepository,
                        UserRepository userRepository,
                        DatabaseClient databaseClient) {
        this.saleRepository = saleRepository;
        this.saleItemRepository = saleItemRepository;
        this.workShiftRepository = workShiftRepository;
        this.userRepository = userRepository;
        this.databaseClient = databaseClient;
    }

    public Flux<Sale> findAll() {
        return databaseClient.sql("""
                        SELECT s.sale_id,
                               s.sale_number,
                               s.sale_datetime,
                               s.location_id,
                               s.cashier_user_id,
                               s.created_by,
                               s.shift_id,
                               s.total_amount,
                               s.status,
                               s.inventory_processed,
                               s.created_at,
                               s.updated_at,
                               u.username AS cashier_username,
                               u.full_name AS cashier_full_name,
                               cb.username AS created_by_username,
                               cb.full_name AS created_by_full_name,
                               l.location_name
                        FROM sales s
                                 LEFT JOIN app_users u ON u.user_id = s.cashier_user_id
                                 LEFT JOIN app_users cb ON cb.user_id = s.created_by
                                 LEFT JOIN locations l ON l.location_id = s.location_id
                        ORDER BY s.sale_datetime DESC, s.sale_id DESC
                        """)
                .map((row, meta) -> mapSaleRow(row))
                .all();
    }

    public Mono<Sale> findById(Long id) {
        return saleRepository.findById(id);
    }

    public Flux<SaleItem> findItems(Long saleId) {
        return saleItemRepository.findBySaleId(saleId);
    }

    public Mono<Sale> createSale(CreateSaleRequest request) {
        return Mono.zip(resolveActorUserId(), resolveCashierUserId(request.getCashierUserId()))
                .flatMap(tuple -> persistSale(tuple, request));
    }

    private Mono<Sale> persistSale(Tuple2<Long, Long> actors, CreateSaleRequest request) {
        Long createdBy = actors.getT1();
        Long cashierId = actors.getT2();
        request.setCashierUserId(cashierId);
        if (request.getSaleDatetime() == null) {
            request.setSaleDatetime(Instant.now());
        }
        validateSaleRequest(request);
        List<com.bar.inventory.dto.CreateSaleItemRequest> items =
                request.getItems() == null ? List.of() : request.getItems();
        return validateShiftAssignment(request)
                .then(buildSaleForInsert(request, createdBy))
                .flatMap(saleRepository::save)
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

    private Mono<Sale> buildSaleForInsert(CreateSaleRequest request, Long createdBy) {
        boolean autoSaleNumber = request.getSaleNumber() == null || request.getSaleNumber().isBlank();
        if (autoSaleNumber) {
            return databaseClient.sql("SELECT nextval('sale_public_number_seq') AS n")
                    .map((row, meta) -> row.get("n", Long.class))
                    .one()
                    .map(seq -> {
                        Sale sale = new Sale();
                        sale.setSaleNumber("VTA-" + String.format("%08d", seq));
                        fillSaleFields(sale, request, createdBy);
                        return sale;
                    });
        }
        Sale sale = new Sale();
        sale.setSaleNumber(request.getSaleNumber().trim());
        fillSaleFields(sale, request, createdBy);
        return Mono.just(sale);
    }

    private void fillSaleFields(Sale sale, CreateSaleRequest request, Long createdBy) {
        sale.setSaleDatetime(request.getSaleDatetime());
        sale.setLocationId(request.getLocationId());
        sale.setCashierUserId(request.getCashierUserId());
        sale.setCreatedBy(createdBy);
        sale.setShiftId(request.getShiftId());
        sale.setTotalAmount(request.getTotalAmount());
        sale.setStatus(request.getStatus() == null ? "PAID" : request.getStatus());
        sale.setInventoryProcessed(false);
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
                    long effectiveUserId = userId != null && userId > 0
                            ? userId
                            : (sale.getCashierUserId() != null ? sale.getCashierUserId() : 1L);
                    return databaseClient.sql("SELECT fn_post_sale_to_inventory(%d, %d) AS txn_id".formatted(saleId, effectiveUserId))
                            .map((row, meta) -> row.get("txn_id", Long.class))
                            .one();
                });
    }

    private Mono<Long> resolveActorUserId() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getName())
                .flatMap(userRepository::findByUsername)
                .map(User::getId)
                .switchIfEmpty(Mono.error(new IllegalStateException("No se pudo resolver el usuario autenticado")));
    }

    private Mono<Long> resolveCashierUserId(Long requested) {
        if (requested != null && requested > 0) {
            return Mono.just(requested);
        }
        return resolveActorUserId();
    }

    private Sale mapSaleRow(Row row) {
        Sale sale = new Sale();
        sale.setId(row.get("sale_id", Long.class));
        sale.setSaleNumber(row.get("sale_number", String.class));
        sale.setSaleDatetime(row.get("sale_datetime", Instant.class));
        sale.setLocationId(row.get("location_id", Long.class));
        sale.setCashierUserId(row.get("cashier_user_id", Long.class));
        sale.setCreatedBy(row.get("created_by", Long.class));
        sale.setShiftId(row.get("shift_id", Long.class));
        sale.setTotalAmount(row.get("total_amount", BigDecimal.class));
        sale.setStatus(row.get("status", String.class));
        sale.setInventoryProcessed(row.get("inventory_processed", Boolean.class));
        sale.setCreatedAt(row.get("created_at", Instant.class));
        sale.setUpdatedAt(row.get("updated_at", Instant.class));
        sale.setCashierUsername(row.get("cashier_username", String.class));
        sale.setCashierFullName(row.get("cashier_full_name", String.class));
        sale.setCreatedByUsername(row.get("created_by_username", String.class));
        sale.setCreatedByFullName(row.get("created_by_full_name", String.class));
        sale.setLocationName(row.get("location_name", String.class));
        return sale;
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
