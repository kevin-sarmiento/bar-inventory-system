package com.bar.inventory.service;

import com.bar.inventory.dto.MovementReportDto;
import com.bar.inventory.dto.StockViewDto;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Map;

@Service
public class ReportService {

    private final DatabaseClient client;

    public ReportService(DatabaseClient client) {
        this.client = client;
    }

    public Flux<StockViewDto> getCurrentStock(Long locationId) {
        String base = "SELECT * FROM vw_inventory_current";
        if (locationId != null) {
            base += " WHERE location_id = :locationId";
            return client.sql(base)
                    .bind("locationId", locationId)
                    .map((row, meta) -> mapStock(row.get("stock_balance_id", Long.class),
                            row.get("product_id", Long.class),
                            row.get("product_name", String.class),
                            row.get("category_name", String.class),
                            row.get("location_id", Long.class),
                            row.get("location_name", String.class),
                            row.get("base_unit", String.class),
                            row.get("lot_number", String.class),
                            row.get("expiration_date", LocalDate.class),
                            row.get("quantity_base", java.math.BigDecimal.class),
                            row.get("min_stock_base_qty", java.math.BigDecimal.class),
                            row.get("below_min_stock", Boolean.class),
                            row.get("avg_unit_cost_base", java.math.BigDecimal.class),
                            row.get("total_value", java.math.BigDecimal.class)
                    )).all();
        }
        return client.sql(base)
                .map((row, meta) -> mapStock(
                        row.get("stock_balance_id", Long.class),
                        row.get("product_id", Long.class),
                        row.get("product_name", String.class),
                        row.get("category_name", String.class),
                        row.get("location_id", Long.class),
                        row.get("location_name", String.class),
                        row.get("base_unit", String.class),
                        row.get("lot_number", String.class),
                        row.get("expiration_date", LocalDate.class),
                        row.get("quantity_base", java.math.BigDecimal.class),
                        row.get("min_stock_base_qty", java.math.BigDecimal.class),
                        row.get("below_min_stock", Boolean.class),
                        row.get("avg_unit_cost_base", java.math.BigDecimal.class),
                        row.get("total_value", java.math.BigDecimal.class)
                )).all();
    }

    public Flux<MovementReportDto> getMovements(LocalDate from, LocalDate to, String type) {
        StringBuilder sql = new StringBuilder("SELECT * FROM vw_report_movements WHERE 1=1");
        Map<String, Object> params = new java.util.HashMap<>();

        if (from != null) {
            sql.append(" AND transaction_date >= :fromDate");
            params.put("fromDate", OffsetDateTime.of(from.atStartOfDay(), ZoneOffset.UTC));
        }
        if (to != null) {
            sql.append(" AND transaction_date < :toDate");
            params.put("toDate", OffsetDateTime.of(to.plusDays(1).atStartOfDay(), ZoneOffset.UTC));
        }
        if (type != null && !type.isBlank()) {
            sql.append(" AND transaction_type = :type");
            params.put("type", type);
        }
        sql.append(" ORDER BY transaction_date DESC");

        DatabaseClient.GenericExecuteSpec spec = client.sql(sql.toString());
        for (var entry : params.entrySet()) {
            spec = spec.bind(entry.getKey(), entry.getValue());
        }

        return spec.map((row, meta) -> mapMovement(
                row.get("transaction_id", Long.class),
                row.get("transaction_number", String.class),
                row.get("transaction_type", String.class),
                row.get("transaction_date", java.time.OffsetDateTime.class),
                row.get("source_location", String.class),
                row.get("target_location", String.class),
                row.get("product_id", Long.class),
                row.get("product_name", String.class),
                row.get("unit_id", Long.class),
                row.get("unit_code", String.class),
                row.get("quantity", java.math.BigDecimal.class),
                row.get("quantity_base", java.math.BigDecimal.class),
                row.get("unit_cost", java.math.BigDecimal.class),
                row.get("unit_cost_base", java.math.BigDecimal.class),
                row.get("lot_number", String.class),
                row.get("expiration_date", LocalDate.class),
                row.get("reference_text", String.class),
                row.get("reason", String.class),
                row.get("status", String.class),
                row.get("created_by", String.class)
        )).all();
    }

    private StockViewDto mapStock(Long stockBalanceId, Long productId, String productName, String categoryName,
                                  Long locationId, String locationName, String baseUnit, String lotNumber,
                                  LocalDate expirationDate, java.math.BigDecimal quantityBase,
                                  java.math.BigDecimal minStockBaseQty, Boolean belowMinStock,
                                  java.math.BigDecimal avgUnitCostBase, java.math.BigDecimal totalValue) {
        StockViewDto dto = new StockViewDto();
        dto.setStockBalanceId(stockBalanceId);
        dto.setProductId(productId);
        dto.setProductName(productName);
        dto.setCategoryName(categoryName);
        dto.setLocationId(locationId);
        dto.setLocationName(locationName);
        dto.setBaseUnit(baseUnit);
        dto.setLotNumber(lotNumber);
        dto.setExpirationDate(expirationDate);
        dto.setQuantityBase(quantityBase);
        dto.setMinStockBaseQty(minStockBaseQty);
        dto.setBelowMinStock(belowMinStock);
        dto.setAvgUnitCostBase(avgUnitCostBase);
        dto.setTotalValue(totalValue);
        return dto;
    }

    private MovementReportDto mapMovement(Long transactionId, String transactionNumber, String transactionType,
                                          java.time.OffsetDateTime transactionDate,
                                          String sourceLocation, String targetLocation,
                                          Long productId, String productName,
                                          Long unitId, String unitCode,
                                          java.math.BigDecimal quantity, java.math.BigDecimal quantityBase,
                                          java.math.BigDecimal unitCost, java.math.BigDecimal unitCostBase,
                                          String lotNumber, LocalDate expirationDate,
                                          String referenceText, String reason, String status, String createdBy) {
        MovementReportDto dto = new MovementReportDto();
        dto.setTransactionId(transactionId);
        dto.setTransactionNumber(transactionNumber);
        dto.setTransactionType(transactionType);
        dto.setTransactionDate(transactionDate == null ? null : transactionDate.toInstant());
        dto.setSourceLocation(sourceLocation);
        dto.setTargetLocation(targetLocation);
        dto.setProductId(productId);
        dto.setProductName(productName);
        dto.setUnitId(unitId);
        dto.setUnitCode(unitCode);
        dto.setQuantity(quantity);
        dto.setQuantityBase(quantityBase);
        dto.setUnitCost(unitCost);
        dto.setUnitCostBase(unitCostBase);
        dto.setLotNumber(lotNumber);
        dto.setExpirationDate(expirationDate);
        dto.setReferenceText(referenceText);
        dto.setReason(reason);
        dto.setStatus(status);
        dto.setCreatedBy(createdBy);
        return dto;
    }
}
