package com.bar.inventory.service;

import com.bar.inventory.dto.AuditHistoryDto;
import com.bar.inventory.dto.CountDifferenceDto;
import com.bar.inventory.dto.DashboardHourlySalesDto;
import com.bar.inventory.dto.DashboardSummaryDto;
import com.bar.inventory.dto.DashboardTopProductDto;
import com.bar.inventory.dto.DashboardTopUserDto;
import com.bar.inventory.dto.InventoryValuationDto;
import com.bar.inventory.dto.MovementReportDto;
import com.bar.inventory.dto.ShiftReportDto;
import com.bar.inventory.dto.ShiftSalesByLocationDto;
import com.bar.inventory.dto.ShiftSalesByUserDto;
import com.bar.inventory.dto.StockViewDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class ReportService {
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final DatabaseClient client;

    public ReportService(DatabaseClient client) {
        this.client = client;
    }

    public Flux<StockViewDto> getCurrentStock(Long locationId) {
        String base = "SELECT * FROM vw_inventory_current";
        if (locationId != null) {
            base += " WHERE location_id = %d".formatted(locationId);
            return client.sql(base)
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

    public Mono<DashboardSummaryDto> getDailyDashboard(LocalDate date, Long locationId) {
        LocalDate reportDate = date == null ? LocalDate.now(ZoneId.of("America/Bogota")) : date;
        String locationFilter = locationId == null ? "" : " AND location_id = %d".formatted(locationId);
        String shiftLocationFilter = locationId == null ? "" : " AND ws.location_id = %d".formatted(locationId);

        Mono<String> locationNameMono = resolveLocationFilterLabel(locationId);
        Mono<SalesSummary> salesMono = client.sql("""
                SELECT
                    COUNT(*)::int AS sales_count,
                    COALESCE(SUM(total_amount), 0) AS sales_total
                FROM sales
                WHERE sale_datetime::date = '%s'%s
                """.formatted(reportDate, locationFilter))
                .map((row, meta) -> new SalesSummary(
                        row.get("sales_count", Integer.class),
                        valueOrZero(row.get("sales_total", BigDecimal.class))
                ))
                .one()
                .defaultIfEmpty(new SalesSummary(0, BigDecimal.ZERO));

        Mono<ShiftStatusSummary> shiftsMono = client.sql("""
                SELECT
                    COALESCE(SUM(CASE WHEN ws.status = 'IN_PROGRESS' THEN 1 ELSE 0 END), 0)::int AS active_shifts,
                    COALESCE(SUM(CASE WHEN ws.status = 'SCHEDULED' THEN 1 ELSE 0 END), 0)::int AS scheduled_shifts,
                    COALESCE(SUM(CASE WHEN ws.status = 'COMPLETED' THEN 1 ELSE 0 END), 0)::int AS completed_shifts
                FROM work_shifts ws
                WHERE ws.scheduled_start::date = '%s'%s
                """.formatted(reportDate, shiftLocationFilter))
                .map((row, meta) -> new ShiftStatusSummary(
                        row.get("active_shifts", Integer.class),
                        row.get("scheduled_shifts", Integer.class),
                        row.get("completed_shifts", Integer.class)
                ))
                .one()
                .defaultIfEmpty(new ShiftStatusSummary(0, 0, 0));

        Mono<InventorySnapshot> inventoryMono = client.sql("""
                SELECT
                    COUNT(*) FILTER (WHERE below_min_stock = true)::int AS low_stock_items,
                    COALESCE(SUM(total_value), 0) AS inventory_value
                FROM vw_inventory_current
                WHERE 1=1%s
                """.formatted(locationId == null ? "" : " AND location_id = %d".formatted(locationId)))
                .map((row, meta) -> new InventorySnapshot(
                        row.get("low_stock_items", Integer.class),
                        valueOrZero(row.get("inventory_value", BigDecimal.class))
                ))
                .one()
                .defaultIfEmpty(new InventorySnapshot(0, BigDecimal.ZERO));

        Mono<MovementAggregate> wasteMono = movementAggregate("vw_report_waste", reportDate, locationId);
        Mono<MovementAggregate> consumptionMono = movementAggregate("vw_report_consumption", reportDate, locationId);
        Mono<List<DashboardTopProductDto>> topProductsMono = getTopProducts(reportDate, locationId).collectList();
        Mono<List<DashboardTopUserDto>> topUsersMono = getTopUsers(reportDate, locationId).collectList();
        Mono<List<DashboardHourlySalesDto>> hourlySalesMono = getHourlySales(reportDate, locationId).collectList();

        return Mono.zip(locationNameMono, salesMono, shiftsMono, inventoryMono, wasteMono, consumptionMono, topProductsMono, topUsersMono)
                .zipWith(hourlySalesMono)
                .map(result -> {
                    var tuple = result.getT1();
                    var hourlySales = result.getT2();
                    DashboardSummaryDto dto = new DashboardSummaryDto();
                    dto.setReportDate(reportDate);
                    dto.setLocationId(locationId);
                    dto.setLocationName(tuple.getT1());
                    dto.setSalesCount(tuple.getT2().count());
                    dto.setSalesTotal(tuple.getT2().total());
                    dto.setAverageTicket(calculateAverage(tuple.getT2().total(), tuple.getT2().count()));
                    dto.setActiveShifts(tuple.getT3().active());
                    dto.setScheduledShifts(tuple.getT3().scheduled());
                    dto.setCompletedShifts(tuple.getT3().completed());
                    dto.setLowStockItems(tuple.getT4().lowStockItems());
                    dto.setInventoryValue(tuple.getT4().inventoryValue());
                    dto.setWasteMovementsCount(tuple.getT5().count());
                    dto.setWasteQuantity(tuple.getT5().quantity());
                    dto.setConsumptionMovementsCount(tuple.getT6().count());
                    dto.setConsumptionQuantity(tuple.getT6().quantity());
                    dto.setTopProducts(tuple.getT7());
                    dto.setTopUsers(tuple.getT8());
                    dto.setHourlySales(hourlySales);
                    return dto;
                });
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
                    dto.setCountDate(toInstantValue(row.get("count_date")));
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

    public Flux<AuditHistoryDto> getAuditHistory(LocalDate from, LocalDate to) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    audit_id,
                    table_name,
                    record_pk,
                    action_type,
                    changed_at,
                    changed_by,
                    COALESCE(old_data::text, '') AS old_data,
                    COALESCE(new_data::text, '') AS new_data
                FROM vw_audit_history
                WHERE 1=1
                """);
        if (from != null) {
            sql.append(" AND changed_at::date >= '").append(from).append("'");
        }
        if (to != null) {
            sql.append(" AND changed_at::date <= '").append(to).append("'");
        }
        sql.append(" ORDER BY changed_at DESC");
        return client.sql(sql.toString())
                .map((row, meta) -> {
                    AuditHistoryDto dto = new AuditHistoryDto();
                    dto.setAuditId(row.get("audit_id", Long.class));
                    dto.setTableName(row.get("table_name", String.class));
                    dto.setRecordPk(row.get("record_pk", String.class));
                    dto.setActionType(row.get("action_type", String.class));
                    dto.setChangedAt(toInstantValue(row.get("changed_at")));
                    dto.setChangedBy(row.get("changed_by", String.class));
                    dto.setOldData(nullIfBlank(row.get("old_data", String.class)));
                    dto.setNewData(nullIfBlank(row.get("new_data", String.class)));
                    return dto;
                }).all();
    }

    public Flux<ShiftReportDto> getShiftSummary(LocalDate from, LocalDate to, Long userId, Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    ws.shift_id,
                    ws.user_id,
                    u.username,
                    u.full_name,
                    ws.location_id,
                    l.location_name,
                    ws.role_name,
                    ws.scheduled_start,
                    ws.scheduled_end,
                    ws.actual_start,
                    ws.actual_end,
                    ws.status,
                    COALESCE(sagg.sale_count, 0)::int AS linked_sales_count,
                    COALESCE(sagg.sale_total, 0) AS linked_sales_total
                FROM work_shifts ws
                JOIN app_users u ON u.user_id = ws.user_id
                JOIN locations l ON l.location_id = ws.location_id
                LEFT JOIN (
                    SELECT shift_id,
                           COUNT(*)::int AS sale_count,
                           COALESCE(SUM(total_amount), 0) AS sale_total
                    FROM sales
                    GROUP BY shift_id
                ) sagg ON sagg.shift_id = ws.shift_id
                WHERE 1=1
                """);

        if (from != null) {
            sql.append(" AND ws.scheduled_start::date >= '").append(from).append("'");
        }
        if (to != null) {
            sql.append(" AND ws.scheduled_start::date <= '").append(to).append("'");
        }
        if (userId != null) {
            sql.append(" AND ws.user_id = ").append(userId);
        }
        if (locationId != null) {
            sql.append(" AND ws.location_id = ").append(locationId);
        }

        sql.append(" ORDER BY ws.scheduled_start DESC, ws.shift_id DESC");

        return client.sql(sql.toString())
                .map((row, meta) -> {
                    ShiftReportDto dto = new ShiftReportDto();
                    dto.setShiftId(row.get("shift_id", Long.class));
                    dto.setUserId(row.get("user_id", Long.class));
                    dto.setUsername(row.get("username", String.class));
                    dto.setFullName(row.get("full_name", String.class));
                    dto.setLocationId(row.get("location_id", Long.class));
                    dto.setLocationName(row.get("location_name", String.class));
                    dto.setRoleName(row.get("role_name", String.class));
                    dto.setScheduledStart(toInstantValue(row.get("scheduled_start")));
                    dto.setScheduledEnd(toInstantValue(row.get("scheduled_end")));
                    dto.setActualStart(toInstantValue(row.get("actual_start")));
                    dto.setActualEnd(toInstantValue(row.get("actual_end")));
                    dto.setStatus(row.get("status", String.class));
                    dto.setLinkedSalesCount(row.get("linked_sales_count", Integer.class));
                    dto.setLinkedSalesTotal(row.get("linked_sales_total", java.math.BigDecimal.class));
                    return dto;
                })
                .all();
    }

    public Flux<ShiftSalesByUserDto> getShiftSalesByUser(LocalDate from, LocalDate to, Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    ws.user_id,
                    u.username,
                    u.full_name,
                    COUNT(DISTINCT ws.shift_id)::int AS shifts_count,
                    COUNT(s.sale_id)::int AS linked_sales_count,
                    COALESCE(SUM(s.total_amount), 0) AS linked_sales_total
                FROM work_shifts ws
                JOIN app_users u ON u.user_id = ws.user_id
                LEFT JOIN sales s ON s.shift_id = ws.shift_id
                WHERE 1=1
                """);

        appendShiftDateFilters(sql, from, to);
        if (locationId != null) {
            sql.append(" AND ws.location_id = ").append(locationId);
        }

        sql.append("""
                
                GROUP BY ws.user_id, u.username, u.full_name
                ORDER BY linked_sales_total DESC, shifts_count DESC, u.full_name ASC
                """);

        return client.sql(sql.toString())
                .map((row, meta) -> {
                    ShiftSalesByUserDto dto = new ShiftSalesByUserDto();
                    dto.setUserId(row.get("user_id", Long.class));
                    dto.setUsername(row.get("username", String.class));
                    dto.setFullName(row.get("full_name", String.class));
                    dto.setShiftsCount(row.get("shifts_count", Integer.class));
                    dto.setLinkedSalesCount(row.get("linked_sales_count", Integer.class));
                    dto.setLinkedSalesTotal(row.get("linked_sales_total", java.math.BigDecimal.class));
                    return dto;
                })
                .all();
    }

    public Flux<ShiftSalesByLocationDto> getShiftSalesByLocation(LocalDate from, LocalDate to, Long userId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    ws.location_id,
                    l.location_name,
                    COUNT(DISTINCT ws.shift_id)::int AS shifts_count,
                    COUNT(s.sale_id)::int AS linked_sales_count,
                    COALESCE(SUM(s.total_amount), 0) AS linked_sales_total
                FROM work_shifts ws
                JOIN locations l ON l.location_id = ws.location_id
                LEFT JOIN sales s ON s.shift_id = ws.shift_id
                WHERE 1=1
                """);

        appendShiftDateFilters(sql, from, to);
        if (userId != null) {
            sql.append(" AND ws.user_id = ").append(userId);
        }

        sql.append("""
                
                GROUP BY ws.location_id, l.location_name
                ORDER BY linked_sales_total DESC, shifts_count DESC, l.location_name ASC
                """);

        return client.sql(sql.toString())
                .map((row, meta) -> {
                    ShiftSalesByLocationDto dto = new ShiftSalesByLocationDto();
                    dto.setLocationId(row.get("location_id", Long.class));
                    dto.setLocationName(row.get("location_name", String.class));
                    dto.setShiftsCount(row.get("shifts_count", Integer.class));
                    dto.setLinkedSalesCount(row.get("linked_sales_count", Integer.class));
                    dto.setLinkedSalesTotal(row.get("linked_sales_total", java.math.BigDecimal.class));
                    return dto;
                })
                .all();
    }

    public Mono<String> exportShiftSummaryCsv(LocalDate from, LocalDate to, Long userId, Long locationId) {
        return getShiftSummary(from, to, userId, locationId)
                .collectList()
                .map(rows -> toCsv(
                        List.of("ID Turno", "ID Usuario", "Usuario", "Nombre completo", "ID Sede", "Sede",
                                "Rol del turno", "Inicio programado", "Fin programado", "Entrada real", "Salida real",
                                "Estado", "Cantidad de ventas", "Total vendido"),
                        rows.stream()
                                .map(row -> List.of(
                                        csvValue(row.getShiftId()),
                                        csvValue(row.getUserId()),
                                        csvValue(row.getUsername()),
                                        csvValue(row.getFullName()),
                                        csvValue(row.getLocationId()),
                                        csvValue(row.getLocationName()),
                                        csvValue(roleNameLabel(row.getRoleName())),
                                        csvValue(row.getScheduledStart()),
                                        csvValue(row.getScheduledEnd()),
                                        csvValue(row.getActualStart()),
                                        csvValue(row.getActualEnd()),
                                        csvValue(shiftStatusLabel(row.getStatus())),
                                        csvValue(row.getLinkedSalesCount()),
                                        csvValue(row.getLinkedSalesTotal())
                                ))
                                .toList()
                ));
    }

    public Mono<String> exportShiftSalesByUserCsv(LocalDate from, LocalDate to, Long locationId) {
        return getShiftSalesByUser(from, to, locationId)
                .collectList()
                .map(rows -> toCsv(
                        List.of("userId", "username", "fullName", "shiftsCount", "linkedSalesCount", "linkedSalesTotal"),
                        rows.stream()
                                .map(row -> List.of(
                                        csvValue(row.getUserId()),
                                        csvValue(row.getUsername()),
                                        csvValue(row.getFullName()),
                                        csvValue(row.getShiftsCount()),
                                        csvValue(row.getLinkedSalesCount()),
                                        csvValue(row.getLinkedSalesTotal())
                                ))
                                .toList()
                ));
    }

    public Mono<String> exportShiftSalesByLocationCsv(LocalDate from, LocalDate to, Long userId) {
        return getShiftSalesByLocation(from, to, userId)
                .collectList()
                .map(rows -> toCsv(
                        List.of("locationId", "locationName", "shiftsCount", "linkedSalesCount", "linkedSalesTotal"),
                        rows.stream()
                                .map(row -> List.of(
                                        csvValue(row.getLocationId()),
                                        csvValue(row.getLocationName()),
                                        csvValue(row.getShiftsCount()),
                                        csvValue(row.getLinkedSalesCount()),
                                        csvValue(row.getLinkedSalesTotal())
                                ))
                                .toList()
                ));
    }

    public Mono<byte[]> exportShiftSummaryXlsx(LocalDate from, LocalDate to, Long userId, Long locationId) {
        return Mono.zip(
                getShiftSummary(from, to, userId, locationId).collectList(),
                resolveUserFilterLabel(userId),
                resolveLocationFilterLabel(locationId)
        ).map(tuple -> toWorkbookBytes("Resumen de turnos",
                buildShiftSummaryFilters(from, to, userId, tuple.getT2(), locationId, tuple.getT3()),
                List.of("ID Turno", "ID Usuario", "Usuario", "Nombre completo", "ID Sede", "Sede",
                        "Rol del turno", "Inicio programado", "Fin programado", "Entrada real", "Salida real",
                        "Estado", "Cantidad de ventas", "Total vendido"),
                tuple.getT1().stream()
                        .map(row -> List.of(
                                cellNumber(row.getShiftId()),
                                cellNumber(row.getUserId()),
                                cellText(row.getUsername()),
                                cellText(row.getFullName()),
                                cellNumber(row.getLocationId()),
                                cellText(row.getLocationName()),
                                cellText(roleNameLabel(row.getRoleName())),
                                cellDateTime(row.getScheduledStart()),
                                cellDateTime(row.getScheduledEnd()),
                                cellDateTime(row.getActualStart()),
                                cellDateTime(row.getActualEnd()),
                                cellText(shiftStatusLabel(row.getStatus())),
                                cellNumber(row.getLinkedSalesCount()),
                                cellAmount(row.getLinkedSalesTotal())
                        ))
                        .toList()));
    }

    public Mono<byte[]> exportShiftSalesByUserXlsx(LocalDate from, LocalDate to, Long locationId) {
        return Mono.zip(
                getShiftSalesByUser(from, to, locationId).collectList(),
                resolveLocationFilterLabel(locationId)
        ).map(tuple -> toWorkbookBytes("Ventas por usuario",
                buildByUserFilters(from, to, locationId, tuple.getT2()),
                List.of("ID Usuario", "Usuario", "Nombre completo", "Cantidad de turnos", "Cantidad de ventas", "Total vendido"),
                tuple.getT1().stream()
                        .map(row -> List.of(
                                cellNumber(row.getUserId()),
                                cellText(row.getUsername()),
                                cellText(row.getFullName()),
                                cellNumber(row.getShiftsCount()),
                                cellNumber(row.getLinkedSalesCount()),
                                cellAmount(row.getLinkedSalesTotal())
                        ))
                        .toList()));
    }

    public Mono<byte[]> exportShiftSalesByLocationXlsx(LocalDate from, LocalDate to, Long userId) {
        return Mono.zip(
                getShiftSalesByLocation(from, to, userId).collectList(),
                resolveUserFilterLabel(userId)
        ).map(tuple -> toWorkbookBytes("Ventas por sede",
                buildByLocationFilters(from, to, userId, tuple.getT2()),
                List.of("ID Sede", "Sede", "Cantidad de turnos", "Cantidad de ventas", "Total vendido"),
                tuple.getT1().stream()
                        .map(row -> List.of(
                                cellNumber(row.getLocationId()),
                                cellText(row.getLocationName()),
                                cellNumber(row.getShiftsCount()),
                                cellNumber(row.getLinkedSalesCount()),
                                cellAmount(row.getLinkedSalesTotal())
                        ))
                        .toList()));
    }

    public Mono<byte[]> exportCurrentStockXlsx(Long locationId) {
        return Mono.zip(
                getCurrentStock(locationId).collectList(),
                resolveLocationFilterLabel(locationId)
        ).map(tuple -> toWorkbookBytes("Inventario actual",
                buildStockFilters(locationId, tuple.getT2()),
                List.of("ID Stock", "ID Producto", "Producto", "Categoria", "ID Sede", "Sede", "Unidad base",
                        "Lote", "Vencimiento", "Cantidad base", "Stock minimo", "Bajo minimo",
                        "Costo promedio", "Valor total"),
                tuple.getT1().stream()
                        .map(row -> List.of(
                                cellNumber(row.getStockBalanceId()),
                                cellNumber(row.getProductId()),
                                cellText(row.getProductName()),
                                cellText(row.getCategoryName()),
                                cellNumber(row.getLocationId()),
                                cellText(row.getLocationName()),
                                cellText(row.getBaseUnit()),
                                cellText(row.getLotNumber()),
                                cellDate(row.getExpirationDate()),
                                cellAmount(row.getQuantityBase()),
                                cellAmount(row.getMinStockBaseQty()),
                                cellText(row.getBelowMinStock() == null ? null : (row.getBelowMinStock() ? "Si" : "No")),
                                cellAmount(row.getAvgUnitCostBase()),
                                cellAmount(row.getTotalValue())
                        ))
                        .toList()));
    }

    public Mono<byte[]> exportMovementsXlsx(LocalDate from, LocalDate to, String type) {
        return getMovements(from, to, type)
                .collectList()
                .map(rows -> toWorkbookBytes("Movimientos",
                        buildMovementFilters(from, to, type),
                        movementHeaders(),
                        rows.stream().map(this::movementRow).toList()));
    }

    public Mono<byte[]> exportWasteXlsx(LocalDate from, LocalDate to) {
        return getWaste(from, to)
                .collectList()
                .map(rows -> toWorkbookBytes("Mermas",
                        buildDateRangeFilters(from, to),
                        movementHeaders(),
                        rows.stream()
                                .map(this::movementRow)
                                .toList()));
    }

    public Mono<byte[]> exportConsumptionXlsx(LocalDate from, LocalDate to) {
        return getConsumption(from, to)
                .collectList()
                .map(rows -> toWorkbookBytes("Consumo",
                        buildDateRangeFilters(from, to),
                        movementHeaders(),
                        rows.stream()
                                .map(this::movementRow)
                                .toList()));
    }

    public Mono<byte[]> exportAuditHistoryXlsx(LocalDate from, LocalDate to) {
        return getAuditHistory(from, to)
                .collectList()
                .map(rows -> toWorkbookBytes("Auditoria",
                        buildAuditFilters(from, to),
                        List.of("ID Auditoria", "Tabla", "PK Registro", "Accion", "Fecha cambio", "Usuario",
                                "Datos anteriores", "Datos nuevos"),
                        rows.stream()
                                .map(row -> List.of(
                                        cellNumber(row.getAuditId()),
                                        cellText(auditTableLabel(row.getTableName())),
                                        cellText(row.getRecordPk()),
                                        cellText(auditActionLabel(row.getActionType())),
                                        cellDateTime(row.getChangedAt()),
                                        cellText(row.getChangedBy()),
                                        cellWrappedText(formatAuditPayload(row.getOldData())),
                                        cellWrappedText(formatAuditPayload(row.getNewData()))
                                ))
                                .toList()));
    }

    public Mono<byte[]> exportInventoryValuationXlsx() {
        return getInventoryValuation()
                .collectList()
                .map(rows -> toWorkbookBytes("Valorizacion inventario",
                        buildInventoryValuationFilters(),
                        List.of("ID Producto", "Producto", "Categoria", "ID Sede", "Sede", "Unidad base",
                                "Cantidad total", "Costo promedio", "Valor total inventario"),
                        rows.stream()
                                .map(row -> List.of(
                                        cellNumber(row.getProductId()),
                                        cellText(row.getProductName()),
                                        cellText(row.getCategoryName()),
                                        cellNumber(row.getLocationId()),
                                        cellText(row.getLocationName()),
                                        cellText(row.getBaseUnit()),
                                        cellAmount(row.getTotalQtyBase()),
                                        cellAmount(row.getAvgCostBase()),
                                        cellAmount(row.getTotalInventoryValue())
                                ))
                                .toList()));
    }

    public Mono<byte[]> exportCountDifferencesXlsx() {
        return getCountDifferences()
                .collectList()
                .map(rows -> toWorkbookBytes("Diferencias conteo",
                        buildCountDifferencesFilters(),
                        List.of("ID Conteo", "Numero conteo", "Fecha conteo", "Sede", "ID Producto", "Producto",
                                "Cantidad teorica", "Cantidad real", "Diferencia", "Unidad base", "Creado por", "Aprobado por"),
                        rows.stream()
                                .map(row -> List.of(
                                        cellNumber(row.getPhysicalCountId()),
                                        cellText(row.getCountNumber()),
                                        cellDateTime(row.getCountDate()),
                                        cellText(row.getLocationName()),
                                        cellNumber(row.getProductId()),
                                        cellText(row.getProductName()),
                                        cellAmount(row.getTheoreticalQtyBase()),
                                        cellAmount(row.getActualQtyBase()),
                                        cellAmount(row.getDifferenceQtyBase()),
                                        cellText(row.getBaseUnit()),
                                        cellText(row.getCreatedBy()),
                                        cellText(row.getApprovedBy())
                                ))
                                .toList()));
    }

    private Flux<MovementReportDto> getMovementsFromView(String viewName, LocalDate from, LocalDate to, String type) {
        StringBuilder sql = new StringBuilder("SELECT * FROM " + viewName + " WHERE 1=1");

        if (from != null) {
            sql.append(" AND transaction_date >= '")
                    .append(OffsetDateTime.of(from.atStartOfDay(), ZoneOffset.UTC))
                    .append("'");
        }
        if (to != null) {
            sql.append(" AND transaction_date < '")
                    .append(OffsetDateTime.of(to.plusDays(1).atStartOfDay(), ZoneOffset.UTC))
                    .append("'");
        }
        if (type != null && !type.isBlank()) {
            sql.append(" AND transaction_type = '")
                    .append(type.replace("'", "''"))
                    .append("'");
        }
        sql.append(" ORDER BY transaction_date DESC");

        return client.sql(sql.toString()).map((row, meta) -> mapMovement(
                row.get("transaction_id", Long.class),
                row.get("transaction_number", String.class),
                row.get("transaction_type", String.class),
                toInstantValue(row.get("transaction_date")),
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
                                          Instant transactionDate,
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
        dto.setTransactionDate(transactionDate);
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

    private Instant toInstantValue(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (value instanceof LocalDateTime localDateTime) {
            return localDateTime.toInstant(ZoneOffset.UTC);
        }
        if (value instanceof java.sql.Timestamp timestamp) {
            return timestamp.toInstant();
        }
        if (value instanceof Instant instant) {
            return instant;
        }
        if (value instanceof java.time.ZonedDateTime zonedDateTime) {
            return zonedDateTime.toInstant();
        }
        throw new IllegalArgumentException("Tipo de fecha no soportado: " + value.getClass().getName());
    }

    private void appendShiftDateFilters(StringBuilder sql, LocalDate from, LocalDate to) {
        if (from != null) {
            sql.append(" AND ws.scheduled_start::date >= '").append(from).append("'");
        }
        if (to != null) {
            sql.append(" AND ws.scheduled_start::date <= '").append(to).append("'");
        }
    }

    private String toCsv(List<String> headers, List<List<String>> rows) {
        List<String> lines = new ArrayList<>();
        lines.add("sep=;");
        lines.add(String.join(";", headers));
        for (List<String> row : rows) {
            lines.add(String.join(";", row));
        }
        // BOM para que Excel reconozca UTF-8 (tildes y caracteres especiales).
        return "\uFEFF" + String.join("\n", lines);
    }

    private String csvValue(Object value) {
        if (value == null) {
            return "";
        }
        if (value instanceof Instant instant) {
            return escapeCsv(formatInstant(instant));
        }
        if (value instanceof BigDecimal decimal) {
            return escapeCsv(decimal.toPlainString());
        }
        return escapeCsv(value.toString());
    }

    private String escapeCsv(String value) {
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }

    private byte[] toWorkbookBytes(String sheetName, List<List<String>> filters, List<String> headers, List<List<ExcelCellValue>> rows) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet filtersSheet = workbook.createSheet("Filtros");
            Sheet sheet = workbook.createSheet(sheetName);
            ExcelStyles styles = createStyles(workbook);
            writeFiltersSheet(filtersSheet, filters, styles);
            writeHeaderRow(sheet, 0, headers, styles.header());
            sheet.createFreezePane(0, 1);
            for (int i = 0; i < rows.size(); i++) {
                writeDataRow(sheet, i + 1, rows.get(i), styles);
            }
            for (int i = 0; i < headers.size(); i++) {
                sheet.autoSizeColumn(i);
            }
            adjustSheetLayout(sheetName, sheet);
            filtersSheet.autoSizeColumn(0);
            filtersSheet.autoSizeColumn(1);
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException ex) {
            throw new IllegalStateException("No se pudo generar el archivo XLSX", ex);
        }
    }

    private void writeFiltersSheet(Sheet sheet, List<List<String>> filters, ExcelStyles styles) {
        writeHeaderRow(sheet, 0, List.of("Filtro", "Valor"), styles.header());
        for (int i = 0; i < filters.size(); i++) {
            var row = sheet.createRow(i + 1);
            Cell keyCell = row.createCell(0);
            keyCell.setCellValue(filters.get(i).get(0));
            keyCell.setCellStyle(styles.text());

            Cell valueCell = row.createCell(1);
            valueCell.setCellValue(filters.get(i).get(1));
            valueCell.setCellStyle(styles.text());
        }
        sheet.createFreezePane(0, 1);
    }

    private void writeHeaderRow(Sheet sheet, int rowIndex, List<String> values, CellStyle headerStyle) {
        var row = sheet.createRow(rowIndex);
        for (int i = 0; i < values.size(); i++) {
            Cell cell = row.createCell(i);
            cell.setCellValue(values.get(i));
            cell.setCellStyle(headerStyle);
        }
    }

    private void writeDataRow(Sheet sheet, int rowIndex, List<ExcelCellValue> values, ExcelStyles styles) {
        var row = sheet.createRow(rowIndex);
        int maxLines = 1;
        for (int i = 0; i < values.size(); i++) {
            ExcelCellValue value = values.get(i);
            Cell cell = row.createCell(i);
            if (value.value() == null) {
                cell.setBlank();
                cell.setCellStyle(styles.text());
                continue;
            }

            switch (value.type()) {
                case NUMBER -> {
                    cell.setCellValue(((Number) value.value()).doubleValue());
                    cell.setCellStyle(styles.number());
                }
                case AMOUNT -> {
                    double numeric = toAmountDouble(value.value());
                    cell.setCellValue(numeric);
                    cell.setCellStyle(styles.amount());
                }
                case DATE_TIME -> {
                    cell.setCellValue(formatInstant((Instant) value.value()));
                    cell.setCellStyle(styles.dateTime());
                }
                case DATE -> {
                    cell.setCellValue(formatLocalDate((LocalDate) value.value()));
                    cell.setCellStyle(styles.date());
                }
                case TEXT -> {
                    cell.setCellValue(value.value().toString());
                    cell.setCellStyle(styles.text());
                }
                case WRAPPED_TEXT -> {
                    String text = value.value().toString();
                    cell.setCellValue(text);
                    cell.setCellStyle(styles.wrappedText());
                    maxLines = Math.max(maxLines, lineCount(text));
                }
            }
        }
        if (maxLines > 1) {
            row.setHeightInPoints(sheet.getDefaultRowHeightInPoints() * Math.min(maxLines + 1, 18));
        }
    }

    private ExcelStyles createStyles(Workbook workbook) {
        var dataFormat = workbook.createDataFormat();

        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setFontHeightInPoints((short) 11);

        CellStyle headerStyle = workbook.createCellStyle();
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.TEAL.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(headerStyle);

        CellStyle textStyle = workbook.createCellStyle();
        textStyle.setAlignment(HorizontalAlignment.CENTER);
        textStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(textStyle);

        CellStyle wrappedTextStyle = workbook.createCellStyle();
        wrappedTextStyle.setWrapText(true);
        wrappedTextStyle.setAlignment(HorizontalAlignment.CENTER);
        wrappedTextStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(wrappedTextStyle);

        CellStyle numberStyle = workbook.createCellStyle();
        numberStyle.setDataFormat(dataFormat.getFormat("0"));
        numberStyle.setAlignment(HorizontalAlignment.CENTER);
        numberStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(numberStyle);

        CellStyle amountStyle = workbook.createCellStyle();
        amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));
        amountStyle.setAlignment(HorizontalAlignment.CENTER);
        amountStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(amountStyle);

        CellStyle dateTimeStyle = workbook.createCellStyle();
        dateTimeStyle.setDataFormat(dataFormat.getFormat("@"));
        dateTimeStyle.setAlignment(HorizontalAlignment.CENTER);
        dateTimeStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(dateTimeStyle);

        CellStyle dateStyle = workbook.createCellStyle();
        dateStyle.setDataFormat(dataFormat.getFormat("@"));
        dateStyle.setAlignment(HorizontalAlignment.CENTER);
        dateStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(dateStyle);

        return new ExcelStyles(headerStyle, textStyle, wrappedTextStyle, numberStyle, amountStyle, dateTimeStyle, dateStyle);
    }

    private void applyBorders(CellStyle style) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
    }

    private void adjustSheetLayout(String sheetName, Sheet sheet) {
        if ("Auditoria".equals(sheetName)) {
            sheet.setColumnWidth(0, 14 * 256);
            sheet.setColumnWidth(1, 20 * 256);
            sheet.setColumnWidth(2, 14 * 256);
            sheet.setColumnWidth(3, 16 * 256);
            sheet.setColumnWidth(4, 24 * 256);
            sheet.setColumnWidth(5, 20 * 256);
            sheet.setColumnWidth(6, 62 * 256);
            sheet.setColumnWidth(7, 62 * 256);
        }
        if ("Resumen de turnos".equals(sheetName)) {
            sheet.setColumnWidth(0, 12 * 256);
            sheet.setColumnWidth(1, 12 * 256);
            sheet.setColumnWidth(2, 18 * 256);
            sheet.setColumnWidth(3, 24 * 256);
            sheet.setColumnWidth(4, 12 * 256);
            sheet.setColumnWidth(5, 24 * 256);
            sheet.setColumnWidth(6, 18 * 256);
            sheet.setColumnWidth(7, 22 * 256);
            sheet.setColumnWidth(8, 22 * 256);
            sheet.setColumnWidth(9, 22 * 256);
            sheet.setColumnWidth(10, 22 * 256);
            sheet.setColumnWidth(11, 16 * 256);
            sheet.setColumnWidth(12, 16 * 256);
            sheet.setColumnWidth(13, 16 * 256);
        }
    }

    private String formatInstant(Instant instant) {
        return instant.atZone(ZoneId.of("America/Bogota"))
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private String formatLocalDate(LocalDate date) {
        return date.format(DateTimeFormatter.ISO_LOCAL_DATE);
    }

    private ExcelCellValue cellText(Object value) {
        return new ExcelCellValue(value == null ? null : value.toString(), ExcelCellType.TEXT);
    }

    private ExcelCellValue cellWrappedText(Object value) {
        return new ExcelCellValue(value == null ? null : value.toString(), ExcelCellType.WRAPPED_TEXT);
    }

    private ExcelCellValue cellNumber(Number value) {
        return new ExcelCellValue(value, ExcelCellType.NUMBER);
    }

    private double toAmountDouble(Object raw) {
        if (raw instanceof BigDecimal decimal) {
            return decimal.doubleValue();
        }
        if (raw instanceof Number number) {
            return number.doubleValue();
        }
        throw new IllegalStateException("Valor no numerico para celda de monto: " + (raw == null ? "null" : raw.getClass()));
    }

    private ExcelCellValue cellAmount(BigDecimal value) {
        return new ExcelCellValue(value, ExcelCellType.AMOUNT);
    }

    private ExcelCellValue cellDateTime(Instant value) {
        return new ExcelCellValue(value, ExcelCellType.DATE_TIME);
    }

    private ExcelCellValue cellDate(LocalDate value) {
        return new ExcelCellValue(value, ExcelCellType.DATE);
    }

    private List<List<String>> buildStockFilters(Long locationId, String locationLabel) {
        return List.of(
                List.of("Sede", filterValue(locationLabel)),
                List.of("Sede ID", filterValue(locationId))
        );
    }

    private List<List<String>> buildMovementFilters(LocalDate from, LocalDate to, String type) {
        return List.of(
                List.of("Fecha desde", filterValue(from)),
                List.of("Fecha hasta", filterValue(to)),
                List.of("Tipo", filterValue(transactionTypeFilterLabel(type)))
        );
    }

    private String transactionTypeFilterLabel(String type) {
        if (type == null || type.isBlank()) {
            return null;
        }
        return inventoryTransactionTypeEs(type);
    }

    private List<List<String>> buildDateRangeFilters(LocalDate from, LocalDate to) {
        return List.of(
                List.of("Fecha desde", filterValue(from)),
                List.of("Fecha hasta", filterValue(to))
        );
    }

    private List<List<String>> buildAuditFilters(LocalDate from, LocalDate to) {
        return List.of(
                List.of("Reporte", "Historial de auditoria"),
                List.of("Fecha desde", filterValue(from)),
                List.of("Fecha hasta", filterValue(to))
        );
    }

    private List<List<String>> buildInventoryValuationFilters() {
        return List.of(
                List.of("Reporte", "Valorizacion de inventario"),
                List.of("Filtros", "Sin filtros")
        );
    }

    private List<List<String>> buildCountDifferencesFilters() {
        return List.of(
                List.of("Reporte", "Diferencias de conteo"),
                List.of("Filtros", "Sin filtros")
        );
    }

    private List<String> movementHeaders() {
        return List.of("ID Movimiento", "Numero", "Tipo", "Fecha", "Ubicacion origen", "Ubicacion destino",
                "ID Producto", "Producto", "ID Unidad", "Unidad", "Cantidad", "Cantidad base",
                "Costo unitario", "Costo unitario base", "Lote", "Vencimiento",
                "Referencia", "Motivo", "Estado", "Creado por");
    }

    private List<ExcelCellValue> movementRow(MovementReportDto row) {
        return List.of(
                cellNumber(row.getTransactionId()),
                cellText(row.getTransactionNumber()),
                cellText(inventoryTransactionTypeEs(row.getTransactionType())),
                cellDateTime(row.getTransactionDate()),
                cellText(row.getSourceLocation()),
                cellText(row.getTargetLocation()),
                cellNumber(row.getProductId()),
                cellText(row.getProductName()),
                cellNumber(row.getUnitId()),
                cellText(row.getUnitCode()),
                cellAmount(row.getQuantity()),
                cellAmount(row.getQuantityBase()),
                cellAmount(row.getUnitCost()),
                cellAmount(row.getUnitCostBase()),
                cellText(row.getLotNumber()),
                cellDate(row.getExpirationDate()),
                cellText(row.getReferenceText()),
                cellText(row.getReason()),
                cellText(inventoryTransactionStatusEs(row.getStatus())),
                cellText(row.getCreatedBy())
        );
    }

    private String inventoryTransactionTypeEs(String code) {
        if (code == null || code.isBlank()) {
            return "";
        }
        return switch (code) {
            case "OPENING_STOCK" -> "Stock inicial";
            case "PURCHASE" -> "Compra";
            case "SALE" -> "Venta";
            case "CONSUMPTION" -> "Consumo";
            case "WASTE" -> "Merma";
            case "ADJUSTMENT_IN" -> "Ajuste de entrada";
            case "ADJUSTMENT_OUT" -> "Ajuste de salida";
            case "TRANSFER" -> "Transferencia";
            case "RETURN_TO_SUPPLIER" -> "Devolucion a proveedor";
            case "RETURN_FROM_CUSTOMER" -> "Devolucion de cliente";
            default -> code;
        };
    }

    private String inventoryTransactionStatusEs(String code) {
        if (code == null || code.isBlank()) {
            return "";
        }
        return switch (code) {
            case "DRAFT" -> "Borrador";
            case "POSTED" -> "Publicado";
            case "CANCELLED" -> "Cancelado";
            default -> code;
        };
    }

    private List<List<String>> buildShiftSummaryFilters(
            LocalDate from,
            LocalDate to,
            Long userId,
            String userLabel,
            Long locationId,
            String locationLabel
    ) {
        return List.of(
                List.of("Fecha desde", filterValue(from)),
                List.of("Fecha hasta", filterValue(to)),
                List.of("Usuario", filterValue(userLabel)),
                List.of("Usuario ID", filterValue(userId)),
                List.of("Sede", filterValue(locationLabel)),
                List.of("Sede ID", filterValue(locationId))
        );
    }

    private List<List<String>> buildByUserFilters(LocalDate from, LocalDate to, Long locationId, String locationLabel) {
        return List.of(
                List.of("Fecha desde", filterValue(from)),
                List.of("Fecha hasta", filterValue(to)),
                List.of("Sede", filterValue(locationLabel)),
                List.of("Sede ID", filterValue(locationId))
        );
    }

    private List<List<String>> buildByLocationFilters(LocalDate from, LocalDate to, Long userId, String userLabel) {
        return List.of(
                List.of("Fecha desde", filterValue(from)),
                List.of("Fecha hasta", filterValue(to)),
                List.of("Usuario", filterValue(userLabel)),
                List.of("Usuario ID", filterValue(userId))
        );
    }

    private String filterValue(Object value) {
        return value == null ? "Todos" : value.toString();
    }

    private int lineCount(String text) {
        if (text == null || text.isBlank()) {
            return 1;
        }
        return (int) text.lines().count();
    }

    private String formatAuditPayload(String payload) {
        if (payload == null || payload.isBlank()) {
            return "";
        }
        try {
            JsonNode root = OBJECT_MAPPER.readTree(payload);
            List<String> lines = new ArrayList<>();
            appendAuditLines(lines, "", root, preferredAuditOrder(root));
            return String.join("\n", lines);
        } catch (Exception ignored) {
            return payload;
        }
    }

    private void appendAuditLines(List<String> lines, String prefix, JsonNode node, List<String> preferredOrder) {
        if (node == null || node.isNull()) {
            lines.add(auditFieldLabel(prefix) + ": vacio");
            return;
        }
        if (node.isObject()) {
            List<String> processed = new ArrayList<>();
            for (String key : preferredOrder) {
                JsonNode child = node.get(key);
                if (child != null) {
                    processed.add(key);
                    String nextPrefix = prefix.isBlank() ? key : prefix + "." + key;
                    appendAuditLines(lines, nextPrefix, child, List.of());
                }
            }
            node.fields().forEachRemaining(entry -> {
                if (processed.contains(entry.getKey())) {
                    return;
                }
                String nextPrefix = prefix.isBlank() ? entry.getKey() : prefix + "." + entry.getKey();
                appendAuditLines(lines, nextPrefix, entry.getValue(), List.of());
            });
            return;
        }
        if (node.isArray()) {
            for (int i = 0; i < node.size(); i++) {
                String nextPrefix = prefix + "[" + i + "]";
                appendAuditLines(lines, nextPrefix, node.get(i), List.of());
            }
            return;
        }
        lines.add(auditFieldLabel(prefix) + ": " + auditValueLabel(prefix, node.asText()));
    }

    private List<String> preferredAuditOrder(JsonNode root) {
        if (root == null || !root.isObject()) {
            return List.of();
        }
        return List.of(
                "status",
                "notes",
                "reason",
                "reference_text",
                "transaction_type",
                "role_name",
                "sale_number",
                "count_number",
                "product_name",
                "location_name",
                "user_id",
                "shift_id",
                "sale_id",
                "transaction_id",
                "count_id",
                "location_id",
                "product_id",
                "supplier_id",
                "cashier_user_id",
                "scheduled_start",
                "scheduled_end",
                "actual_start",
                "actual_end",
                "count_date",
                "created_by",
                "approved_by",
                "created_at",
                "updated_at",
                "total_amount"
        );
    }

    private String nullIfBlank(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value;
    }

    private String auditActionLabel(String actionType) {
        if (actionType == null || actionType.isBlank()) {
            return "";
        }
        return switch (actionType.trim().toUpperCase(Locale.ROOT)) {
            case "INSERT" -> "Alta";
            case "UPDATE" -> "Cambio";
            case "DELETE" -> "Baja";
            default -> actionType.trim();
        };
    }

    private String auditTableLabel(String tableName) {
        if (tableName == null || tableName.isBlank()) {
            return "";
        }
        return switch (tableName.trim()) {
            case "work_shifts" -> "Turnos";
            case "sales" -> "Ventas";
            case "inventory_transactions" -> "Transacciones";
            case "physical_counts" -> "Conteos fisicos";
            case "menu_items" -> "Menu";
            case "products" -> "Productos";
            case "locations" -> "Ubicaciones";
            case "app_users" -> "Usuarios";
            default -> tableName.trim();
        };
    }

    private String auditFieldLabel(String fieldPath) {
        if (fieldPath == null || fieldPath.isBlank()) {
            return "Valor";
        }
        return switch (fieldPath.trim()) {
            case "notes" -> "Notas";
            case "status" -> "Estado";
            case "user_id" -> "ID usuario";
            case "shift_id" -> "ID turno";
            case "role_name" -> "Rol";
            case "actual_end" -> "Salida real";
            case "actual_start" -> "Entrada real";
            case "created_at" -> "Creado el";
            case "updated_at" -> "Actualizado el";
            case "created_by" -> "Creado por";
            case "approved_by" -> "Aprobado por";
            case "location_id" -> "ID sede";
            case "location_name" -> "Sede";
            case "sale_id" -> "ID venta";
            case "sale_number" -> "Numero de venta";
            case "count_date" -> "Fecha de conteo";
            case "count_number" -> "Numero de conteo";
            case "reason" -> "Motivo";
            case "reference_text" -> "Referencia";
            case "supplier_id" -> "ID proveedor";
            case "product_id" -> "ID producto";
            case "product_name" -> "Producto";
            case "transaction_id" -> "ID transaccion";
            case "transaction_number" -> "Numero de transaccion";
            case "transaction_type" -> "Tipo de transaccion";
            case "cashier_user_id" -> "ID cajero";
            case "scheduled_start" -> "Inicio programado";
            case "scheduled_end" -> "Fin programado";
            case "full_name" -> "Nombre completo";
            case "username" -> "Usuario";
            case "total_amount" -> "Monto total";
            default -> fieldPath.replace('_', ' ');
        };
    }

    private String auditValueLabel(String fieldPath, String value) {
        if (value == null || value.isBlank()) {
            return "vacio";
        }
        String normalizedField = fieldPath == null ? "" : fieldPath.trim();
        return switch (normalizedField) {
            case "status" -> auditStatusLabel(value);
            case "role_name" -> roleNameLabel(value);
            case "transaction_type" -> inventoryTransactionTypeEs(value);
            case "created_at", "updated_at", "scheduled_start", "scheduled_end", "actual_start", "actual_end", "count_date" -> formatAuditDateTime(value);
            case "total_amount" -> formatAuditAmount(value);
            default -> value;
        };
    }

    private String formatAuditDateTime(String raw) {
        try {
            return OffsetDateTime.parse(raw).atZoneSameInstant(ZoneId.of("America/Bogota"))
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String formatAuditAmount(String raw) {
        try {
            return new BigDecimal(raw).stripTrailingZeros().toPlainString();
        } catch (Exception ignored) {
            return raw;
        }
    }

    private String auditStatusLabel(String status) {
        if (status == null || status.isBlank()) {
            return "";
        }
        return switch (status.trim()) {
            case "SCHEDULED" -> "Programado";
            case "IN_PROGRESS" -> "En curso";
            case "COMPLETED" -> "Completado";
            case "MISSED" -> "No asistio";
            case "CANCELLED" -> "Cancelado";
            case "PAID" -> "Pagada";
            case "OPEN" -> "Abierta";
            case "DRAFT" -> "Borrador";
            case "POSTED" -> "Publicado";
            default -> status.trim();
        };
    }

    private String shiftStatusLabel(String status) {
        if (status == null || status.isBlank()) {
            return "";
        }
        return switch (status.trim()) {
            case "SCHEDULED" -> "Programado";
            case "IN_PROGRESS" -> "En curso";
            case "COMPLETED" -> "Completado";
            case "MISSED" -> "No asistio";
            case "CANCELLED" -> "Cancelado";
            default -> status.trim();
        };
    }

    private String roleNameLabel(String roleName) {
        if (roleName == null || roleName.isBlank()) {
            return "";
        }
        return switch (roleName.trim()) {
            case "ADMINISTRADOR" -> "Administrador";
            case "GERENTE" -> "Gerente";
            case "INVENTARIO" -> "Inventario";
            case "CAJERO" -> "Cajero";
            case "BARTENDER" -> "Bartender";
            default -> roleName.trim();
        };
    }

    private Mono<String> resolveUserFilterLabel(Long userId) {
        if (userId == null) {
            return Mono.just("Todos");
        }
        return client.sql("SELECT COALESCE(full_name, username) AS display_name FROM app_users WHERE user_id = %d".formatted(userId))
                .map((row, meta) -> row.get("display_name", String.class))
                .one()
                .defaultIfEmpty("Usuario " + userId);
    }

    private Mono<String> resolveLocationFilterLabel(Long locationId) {
        if (locationId == null) {
            return Mono.just("Todas");
        }
        return client.sql("SELECT location_name FROM locations WHERE location_id = %d".formatted(locationId))
                .map((row, meta) -> row.get("location_name", String.class))
                .one()
                .defaultIfEmpty("Sede " + locationId);
    }

    private Mono<MovementAggregate> movementAggregate(String viewName, LocalDate date, Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    COUNT(*)::int AS movements_count,
                    COALESCE(SUM(quantity_base), 0) AS total_quantity
                FROM %s v
                WHERE v.transaction_date::date = '%s'
                """.formatted(viewName, date));

        if (locationId != null) {
            sql.append(" AND (v.source_location IS NOT NULL OR v.target_location IS NOT NULL)");
            sql.append("""
                     AND (
                        EXISTS (SELECT 1 FROM locations l WHERE l.location_name = v.source_location AND l.location_id = %d)
                        OR EXISTS (SELECT 1 FROM locations l WHERE l.location_name = v.target_location AND l.location_id = %d)
                     )
                    """.formatted(locationId, locationId));
        }

        return client.sql(sql.toString())
                .map((row, meta) -> new MovementAggregate(
                        row.get("movements_count", Integer.class),
                        valueOrZero(row.get("total_quantity", BigDecimal.class))
                ))
                .one()
                .defaultIfEmpty(new MovementAggregate(0, BigDecimal.ZERO));
    }

    private Flux<DashboardTopProductDto> getTopProducts(LocalDate date, Long locationId) {
        String saleLocationFilter = locationId == null ? "" : " AND s.location_id = %d".formatted(locationId);
        return client.sql("""
                SELECT
                    si.menu_item_id,
                    mi.menu_name,
                    COALESCE(SUM(si.quantity), 0)::int AS quantity_sold,
                    COALESCE(SUM(si.quantity * si.unit_price), 0) AS total_sold
                FROM sale_items si
                JOIN sales s ON s.sale_id = si.sale_id
                JOIN menu_items mi ON mi.menu_item_id = si.menu_item_id
                WHERE s.sale_datetime::date = '%s'%s
                GROUP BY si.menu_item_id, mi.menu_name
                ORDER BY quantity_sold DESC, total_sold DESC, mi.menu_name ASC
                LIMIT 5
                """.formatted(date, saleLocationFilter))
                .map((row, meta) -> {
                    DashboardTopProductDto dto = new DashboardTopProductDto();
                    dto.setMenuItemId(row.get("menu_item_id", Long.class));
                    dto.setMenuItemName(row.get("menu_name", String.class));
                    dto.setQuantitySold(row.get("quantity_sold", Integer.class));
                    dto.setTotalSold(valueOrZero(row.get("total_sold", BigDecimal.class)));
                    return dto;
                })
                .all();
    }

    private Flux<DashboardTopUserDto> getTopUsers(LocalDate date, Long locationId) {
        String saleLocationFilter = locationId == null ? "" : " AND s.location_id = %d".formatted(locationId);
        return client.sql("""
                SELECT
                    u.user_id,
                    u.username,
                    u.full_name,
                    COUNT(s.sale_id)::int AS sales_count,
                    COALESCE(SUM(s.total_amount), 0) AS total_sold
                FROM sales s
                JOIN app_users u ON u.user_id = s.cashier_user_id
                WHERE s.sale_datetime::date = '%s'%s
                GROUP BY u.user_id, u.username, u.full_name
                ORDER BY total_sold DESC, sales_count DESC, u.full_name ASC
                LIMIT 5
                """.formatted(date, saleLocationFilter))
                .map((row, meta) -> {
                    DashboardTopUserDto dto = new DashboardTopUserDto();
                    dto.setUserId(row.get("user_id", Long.class));
                    dto.setUsername(row.get("username", String.class));
                    dto.setFullName(row.get("full_name", String.class));
                    dto.setSalesCount(row.get("sales_count", Integer.class));
                    dto.setTotalSold(valueOrZero(row.get("total_sold", BigDecimal.class)));
                    return dto;
                })
                .all();
    }

    private Flux<DashboardHourlySalesDto> getHourlySales(LocalDate date, Long locationId) {
        String saleLocationFilter = locationId == null ? "" : " AND location_id = %d".formatted(locationId);
        return client.sql("""
                SELECT
                    EXTRACT(HOUR FROM sale_datetime)::int AS hour_of_day,
                    COUNT(*)::int AS sales_count,
                    COALESCE(SUM(total_amount), 0) AS total_sold
                FROM sales
                WHERE sale_datetime::date = '%s'%s
                GROUP BY hour_of_day
                ORDER BY hour_of_day ASC
                """.formatted(date, saleLocationFilter))
                .map((row, meta) -> {
                    DashboardHourlySalesDto dto = new DashboardHourlySalesDto();
                    dto.setHourOfDay(row.get("hour_of_day", Integer.class));
                    dto.setSalesCount(row.get("sales_count", Integer.class));
                    dto.setTotalSold(valueOrZero(row.get("total_sold", BigDecimal.class)));
                    return dto;
                })
                .all();
    }

    private BigDecimal calculateAverage(BigDecimal total, Integer count) {
        if (count == null || count == 0) {
            return BigDecimal.ZERO;
        }
        return total.divide(BigDecimal.valueOf(count), 2, java.math.RoundingMode.HALF_UP);
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private java.time.Instant toInstant(LocalDateTime dateTime) {
        return dateTime == null ? null : dateTime.toInstant(ZoneOffset.UTC);
    }

    private enum ExcelCellType {
        TEXT,
        WRAPPED_TEXT,
        NUMBER,
        AMOUNT,
        DATE_TIME,
        DATE
    }

    private record ExcelCellValue(Object value, ExcelCellType type) {
    }

    private record ExcelStyles(
            CellStyle header,
            CellStyle text,
            CellStyle wrappedText,
            CellStyle number,
            CellStyle amount,
            CellStyle dateTime,
            CellStyle date
    ) {
    }

    private record SalesSummary(Integer count, BigDecimal total) {
    }

    private record ShiftStatusSummary(Integer active, Integer scheduled, Integer completed) {
    }

    private record InventorySnapshot(Integer lowStockItems, BigDecimal inventoryValue) {
    }

    private record MovementAggregate(Integer count, BigDecimal quantity) {
    }
}
