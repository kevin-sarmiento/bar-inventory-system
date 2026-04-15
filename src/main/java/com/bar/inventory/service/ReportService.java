package com.bar.inventory.service;

import com.bar.inventory.dto.AuditHistoryDto;
import com.bar.inventory.dto.CountDifferenceDto;
import com.bar.inventory.dto.InventoryValuationDto;
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

    public Flux<MovementReportDto> getWaste(LocalDate from, LocalDate to) {
        return getMovementsFromView("vw_report_waste", from, to, null);
    }

    public Flux<MovementReportDto> getConsumption(LocalDate from, LocalDate to) {
        return getMovementsFromView("vw_report_consumption", from, to, null);
    }

    public Flux<MovementReportDto> getMovements(LocalDate from, LocalDate to, String type) {
        return getMovementsFromView("vw_report_movements", from, to, type);
    }

    public Flux<CountDifferenceDto> getCountDifferences() {
        return client.sql("SELECT * FROM vw_report_count_differences ORDER BY count_date DESC")
                .map((row, meta) -> {
                    CountDifferenceDto dto = new CountDifferenceDto();
                    dto.setPhysicalCountId(row.get("physical_count_id", Long.class));
                    dto.setCountNumber(row.get("count_number", String.class));
                    dto.setCountDate(toInstant(row.get("count_date", OffsetDateTime.class)));
                    dto.setLocationName(row.get("location_name", String.class));
                    dto.setProductId(row.get("product_id", Long.class));
                    dto.setProductName(row.get("product_name", String.class));
                    dto.setTheoreticalQtyBase(row.get("theoretical_qty_base", java.math.BigDecimal.class));
                    dto.setActualQtyBase(row.get("actual_qty_base", java.math.BigDecimal.class));
                    dto.setDifferenceQtyBase(row.get("difference_qty_base", java.math.BigDecimal.class));
                    dto.setBaseUnit(row.get("base_unit", String.class));
                    dto.setCreatedBy(row.get("created_by", String.class));
                    dto.setApprovedBy(row.get("approved_by", String.class));
                    return dto;
                }).all();
    }

    public Flux<InventoryValuationDto> getInventoryValuation() {
        return client.sql("SELECT * FROM vw_report_inventory_valuation ORDER BY product_name")
                .map((row, meta) -> {
                    InventoryValuationDto dto = new InventoryValuationDto();
                    dto.setProductId(row.get("product_id", Long.class));
                    dto.setProductName(row.get("product_name", String.class));
                    dto.setCategoryName(row.get("category_name", String.class));
                    dto.setLocationId(row.get("location_id", Long.class));
                    dto.setLocationName(row.get("location_name", String.class));
                    dto.setBaseUnit(row.get("base_unit", String.class));
                    dto.setTotalQtyBase(row.get("total_qty_base", java.math.BigDecimal.class));
                    dto.setAvgCostBase(row.get("avg_cost_base", java.math.BigDecimal.class));
                    dto.setTotalInventoryValue(row.get("total_inventory_value", java.math.BigDecimal.class));
                    return dto;
                }).all();
    }

    public Flux<AuditHistoryDto> getAuditHistory() {
        return client.sql("SELECT * FROM vw_audit_history ORDER BY changed_at DESC")
                .map((row, meta) -> {
                    AuditHistoryDto dto = new AuditHistoryDto();
                    dto.setAuditId(row.get("audit_id", Long.class));
                    dto.setTableName(row.get("table_name", String.class));
                    dto.setRecordPk(row.get("record_pk", String.class));
                    dto.setActionType(row.get("action_type", String.class));
                    dto.setChangedAt(toInstant(row.get("changed_at", OffsetDateTime.class)));
                    dto.setChangedBy(row.get("changed_by", String.class));
                    Object oldData = row.get("old_data");
                    Object newData = row.get("new_data");
                    dto.setOldData(oldData == null ? null : oldData.toString());
                    dto.setNewData(newData == null ? null : newData.toString());
                    return dto;
                }).all();
    }

    private Flux<MovementReportDto> getMovementsFromView(String viewName, LocalDate from, LocalDate to, String type) {
        StringBuilder sql = new StringBuilder("SELECT * FROM " + viewName + " WHERE 1=1");
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
                row.get("transaction_date", OffsetDateTime.class),
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

    private java.time.Instant toInstant(OffsetDateTime dateTime) {
        return dateTime == null ? null : dateTime.toInstant();
    }
}
