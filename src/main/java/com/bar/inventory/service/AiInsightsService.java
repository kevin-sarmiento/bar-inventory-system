package com.bar.inventory.service;

import com.bar.inventory.dto.AiAlertDto;
import com.bar.inventory.dto.AiInsightsMetricsDto;
import com.bar.inventory.dto.AiInsightsResponseDto;
import com.bar.inventory.dto.AiReplenishmentSuggestionDto;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiInsightsService {
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("America/Bogota");
    private static final BigDecimal TARGET_COVERAGE_DAYS = new BigDecimal("10");
    private static final BigDecimal MIN_COVERAGE_DAYS = new BigDecimal("7");
    private static final BigDecimal WASTE_MEDIUM_RATIO = new BigDecimal("0.05");
    private static final BigDecimal WASTE_HIGH_RATIO = new BigDecimal("0.10");
    private static final int MAX_ALERTS = 20;
    private static final int MAX_REPLENISHMENT = 12;

    private final DatabaseClient client;

    public AiInsightsService(DatabaseClient client) {
        this.client = client;
    }

    public Mono<AiInsightsResponseDto> getInsights(LocalDate from, LocalDate to, Long locationId) {
        LocalDate toDate = to == null ? LocalDate.now(BUSINESS_ZONE) : to;
        LocalDate fromDate = from == null ? toDate.minusDays(30) : from;
        if (fromDate.isAfter(toDate)) {
            fromDate = toDate;
        }

        long periodDays = Math.max(1, ChronoUnit.DAYS.between(fromDate, toDate) + 1);
        LocalDate finalFromDate = fromDate;
        LocalDate finalToDate = toDate;

        Mono<List<StockSnapshot>> stockMono = getStockSnapshots(locationId).collectList();
        Mono<List<LotSnapshot>> lotMono = getExpiringLots(locationId).collectList();
        Mono<List<UsageAggregate>> consumptionMono = getUsageAggregates("vw_report_consumption", finalFromDate, finalToDate, locationId)
                .collectList();
        Mono<List<UsageAggregate>> wasteMono = getUsageAggregates("vw_report_waste", finalFromDate, finalToDate, locationId)
                .collectList();
        Mono<List<CountDifferenceSnapshot>> countDifferenceMono = getCountDifferences(finalFromDate, finalToDate, locationId)
                .collectList();
        Mono<PendingSalesSnapshot> pendingSalesMono = getPendingSales(finalFromDate, finalToDate, locationId);
        Mono<String> locationNameMono = resolveLocationName(locationId);

        return Mono.zip(stockMono, lotMono, consumptionMono, wasteMono, countDifferenceMono, pendingSalesMono, locationNameMono)
                .map(tuple -> buildResponse(
                        finalFromDate,
                        finalToDate,
                        locationId,
                        tuple.getT7(),
                        periodDays,
                        tuple.getT1(),
                        tuple.getT2(),
                        tuple.getT3(),
                        tuple.getT4(),
                        tuple.getT5(),
                        tuple.getT6()
                ));
    }

    private AiInsightsResponseDto buildResponse(LocalDate fromDate,
                                                LocalDate toDate,
                                                Long locationId,
                                                String locationName,
                                                long periodDays,
                                                List<StockSnapshot> stock,
                                                List<LotSnapshot> lots,
                                                List<UsageAggregate> consumption,
                                                List<UsageAggregate> waste,
                                                List<CountDifferenceSnapshot> countDifferences,
                                                PendingSalesSnapshot pendingSales) {
        Map<StockKey, UsageAggregate> consumptionByKey = toUsageMap(consumption);
        Map<StockKey, UsageAggregate> wasteByKey = toUsageMap(waste);

        List<AiAlertDto> alerts = new ArrayList<>();
        alerts.addAll(buildStockAlerts(stock));
        alerts.addAll(buildExpirationAlerts(lots, toDate));
        alerts.addAll(buildWasteAlerts(waste, consumptionByKey));
        alerts.addAll(buildCountDifferenceAlerts(countDifferences));
        pendingSalesAlert(pendingSales).ifPresent(alerts::add);
        alerts.sort(Comparator.comparing(AiAlertDto::getPriorityScore, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(AiAlertDto::getTitle, Comparator.nullsLast(String::compareToIgnoreCase)));

        List<AiReplenishmentSuggestionDto> replenishment = new ArrayList<>(
                buildReplenishmentSuggestions(stock, consumptionByKey, periodDays)
        );
        replenishment.sort(Comparator.comparing(AiReplenishmentSuggestionDto::getPriorityScore, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(AiReplenishmentSuggestionDto::getProductName, Comparator.nullsLast(String::compareToIgnoreCase)));

        List<AiAlertDto> limitedAlerts = alerts.stream().limit(MAX_ALERTS).toList();
        List<AiReplenishmentSuggestionDto> limitedReplenishment = replenishment.stream().limit(MAX_REPLENISHMENT).toList();

        AiInsightsMetricsDto metrics = buildMetrics(limitedAlerts, limitedReplenishment);
        AiInsightsResponseDto response = new AiInsightsResponseDto();
        response.setFromDate(fromDate);
        response.setToDate(toDate);
        response.setLocationId(locationId);
        response.setLocationName(locationName);
        response.setGeneratedAt(Instant.now());
        response.setAlerts(limitedAlerts);
        response.setReplenishmentSuggestions(limitedReplenishment);
        response.setMetrics(metrics);
        response.setExecutiveSummary(buildExecutiveSummary(metrics, limitedAlerts, limitedReplenishment, wasteByKey));
        return response;
    }

    private List<AiAlertDto> buildStockAlerts(List<StockSnapshot> stock) {
        return stock.stream()
                .filter(item -> item.minStock().compareTo(BigDecimal.ZERO) > 0)
                .filter(item -> item.quantity().compareTo(item.minStock()) <= 0)
                .map(item -> {
                    BigDecimal ratio = safeDivide(item.quantity(), item.minStock(), 4);
                    boolean critical = item.quantity().compareTo(BigDecimal.ZERO) <= 0 || ratio.compareTo(new BigDecimal("0.50")) <= 0;
                    String severity = critical ? "CRITICAL" : "HIGH";
                    AiAlertDto alert = baseProductAlert("LOW_STOCK", severity, item, critical ? 100 : 85);
                    alert.setTitle("Stock bajo: " + item.productName());
                    alert.setMessage("El producto tiene " + formatQty(item.quantity()) + " " + item.baseUnit()
                            + " y su minimo configurado es " + formatQty(item.minStock()) + " " + item.baseUnit() + ".");
                    alert.setRecommendedAction("Priorizar reposicion y revisar si hay ventas o consumos pendientes de registrar.");
                    alert.setQuantity(item.quantity());
                    alert.setThreshold(item.minStock());
                    alert.setReferenceValue(ratio);
                    return alert;
                })
                .toList();
    }

    private List<AiAlertDto> buildExpirationAlerts(List<LotSnapshot> lots, LocalDate today) {
        return lots.stream()
                .filter(lot -> lot.expirationDate() != null)
                .map(lot -> new LotWithDays(lot, ChronoUnit.DAYS.between(today, lot.expirationDate())))
                .filter(item -> item.daysToExpire() >= 0 && item.daysToExpire() <= 15)
                .map(item -> {
                    String severity = item.daysToExpire() <= 3 ? "CRITICAL" : item.daysToExpire() <= 7 ? "HIGH" : "MEDIUM";
                    int score = item.daysToExpire() <= 3 ? 95 : item.daysToExpire() <= 7 ? 80 : 60;
                    LotSnapshot lot = item.lot();
                    AiAlertDto alert = new AiAlertDto();
                    alert.setType("EXPIRATION_RISK");
                    alert.setSeverity(severity);
                    alert.setTitle("Vencimiento proximo: " + lot.productName());
                    alert.setMessage("El lote " + (lot.lotNumber() == null ? "sin numero" : lot.lotNumber())
                            + " vence el " + lot.expirationDate() + " y conserva "
                            + formatQty(lot.quantity()) + " " + lot.baseUnit() + ".");
                    alert.setRecommendedAction("Usar primero este lote, moverlo a venta prioritaria o revisar si corresponde ajustar inventario.");
                    alert.setProductId(lot.productId());
                    alert.setProductName(lot.productName());
                    alert.setLocationId(lot.locationId());
                    alert.setLocationName(lot.locationName());
                    alert.setBaseUnit(lot.baseUnit());
                    alert.setQuantity(lot.quantity());
                    alert.setDueDate(lot.expirationDate());
                    alert.setPriorityScore(score);
                    return alert;
                })
                .toList();
    }

    private List<AiAlertDto> buildWasteAlerts(List<UsageAggregate> waste, Map<StockKey, UsageAggregate> consumptionByKey) {
        return waste.stream()
                .filter(item -> item.totalQuantity().compareTo(BigDecimal.ZERO) > 0)
                .map(item -> {
                    UsageAggregate consumption = consumptionByKey.get(new StockKey(item.productId(), item.locationId()));
                    BigDecimal consumed = consumption == null ? BigDecimal.ZERO : consumption.totalQuantity();
                    BigDecimal wasteRatio = consumed.compareTo(BigDecimal.ZERO) > 0
                            ? safeDivide(item.totalQuantity(), consumed, 4)
                            : BigDecimal.ONE;
                    if (wasteRatio.compareTo(WASTE_MEDIUM_RATIO) < 0) {
                        return null;
                    }

                    boolean high = wasteRatio.compareTo(WASTE_HIGH_RATIO) >= 0 || consumed.compareTo(BigDecimal.ZERO) == 0;
                    AiAlertDto alert = new AiAlertDto();
                    alert.setType("WASTE_ANOMALY");
                    alert.setSeverity(high ? "HIGH" : "MEDIUM");
                    alert.setTitle("Merma inusual: " + item.productName());
                    alert.setMessage("La merma del periodo fue " + formatQty(item.totalQuantity()) + " " + item.baseUnit()
                            + " frente a un consumo de " + formatQty(consumed) + " " + item.baseUnit() + ".");
                    alert.setRecommendedAction("Revisar causas de merma, responsables del turno y condiciones de almacenamiento.");
                    alert.setProductId(item.productId());
                    alert.setProductName(item.productName());
                    alert.setLocationId(item.locationId());
                    alert.setLocationName(item.locationName());
                    alert.setBaseUnit(item.baseUnit());
                    alert.setQuantity(item.totalQuantity());
                    alert.setReferenceValue(wasteRatio);
                    alert.setPriorityScore(high ? 82 : 58);
                    return alert;
                })
                .filter(alert -> alert != null)
                .toList();
    }

    private List<AiAlertDto> buildCountDifferenceAlerts(List<CountDifferenceSnapshot> countDifferences) {
        return countDifferences.stream()
                .filter(item -> item.difference().abs().compareTo(BigDecimal.ZERO) > 0)
                .map(item -> {
                    BigDecimal theoreticalAbs = item.theoretical().abs();
                    BigDecimal differenceAbs = item.difference().abs();
                    BigDecimal ratio = theoreticalAbs.compareTo(BigDecimal.ZERO) > 0
                            ? safeDivide(differenceAbs, theoreticalAbs, 4)
                            : BigDecimal.ONE;
                    if (ratio.compareTo(new BigDecimal("0.10")) < 0 && differenceAbs.compareTo(new BigDecimal("5")) < 0) {
                        return null;
                    }

                    boolean critical = ratio.compareTo(new BigDecimal("0.20")) >= 0 || differenceAbs.compareTo(new BigDecimal("10")) >= 0;
                    AiAlertDto alert = new AiAlertDto();
                    alert.setType("COUNT_DIFFERENCE");
                    alert.setSeverity(critical ? "CRITICAL" : "HIGH");
                    alert.setTitle("Diferencia de conteo: " + item.productName());
                    alert.setMessage("El conteo " + item.countNumber() + " tuvo una diferencia de "
                            + formatQty(item.difference()) + " " + item.baseUnit() + ".");
                    alert.setRecommendedAction("Validar conteo fisico, movimientos pendientes y ajustes automaticos generados.");
                    alert.setProductId(item.productId());
                    alert.setProductName(item.productName());
                    alert.setLocationId(item.locationId());
                    alert.setLocationName(item.locationName());
                    alert.setBaseUnit(item.baseUnit());
                    alert.setQuantity(item.difference());
                    alert.setThreshold(item.theoretical());
                    alert.setReferenceValue(ratio);
                    alert.setPriorityScore(critical ? 92 : 78);
                    return alert;
                })
                .filter(alert -> alert != null)
                .toList();
    }

    private java.util.Optional<AiAlertDto> pendingSalesAlert(PendingSalesSnapshot pendingSales) {
        if (pendingSales.count() == 0) {
            return java.util.Optional.empty();
        }
        AiAlertDto alert = new AiAlertDto();
        alert.setType("PENDING_INVENTORY_POSTING");
        alert.setSeverity(pendingSales.count() >= 5 ? "HIGH" : "MEDIUM");
        alert.setTitle("Ventas pagadas sin descontar inventario");
        alert.setMessage("Hay " + pendingSales.count() + " ventas pagadas sin postear a inventario por un total de "
                + formatQty(pendingSales.totalAmount()) + ".");
        alert.setRecommendedAction("Postear inventario de ventas pagadas para que el stock refleje el consumo real.");
        alert.setQuantity(BigDecimal.valueOf(pendingSales.count()));
        alert.setReferenceValue(pendingSales.totalAmount());
        alert.setPriorityScore(pendingSales.count() >= 5 ? 88 : 62);
        return java.util.Optional.of(alert);
    }

    private List<AiReplenishmentSuggestionDto> buildReplenishmentSuggestions(List<StockSnapshot> stock,
                                                                              Map<StockKey, UsageAggregate> consumptionByKey,
                                                                              long periodDays) {
        BigDecimal days = BigDecimal.valueOf(periodDays);
        return stock.stream()
                .map(item -> {
                    UsageAggregate consumption = consumptionByKey.get(new StockKey(item.productId(), item.locationId()));
                    BigDecimal totalConsumed = consumption == null ? BigDecimal.ZERO : consumption.totalQuantity();
                    BigDecimal avgDaily = safeDivide(totalConsumed, days, 4);
                    BigDecimal coverage = avgDaily.compareTo(BigDecimal.ZERO) > 0
                            ? safeDivide(item.quantity(), avgDaily, 2)
                            : null;
                    boolean belowMin = item.minStock().compareTo(BigDecimal.ZERO) > 0
                            && item.quantity().compareTo(item.minStock()) <= 0;
                    boolean lowCoverage = coverage != null && coverage.compareTo(MIN_COVERAGE_DAYS) <= 0;
                    if (!belowMin && !lowCoverage) {
                        return null;
                    }

                    BigDecimal targetByConsumption = avgDaily.multiply(TARGET_COVERAGE_DAYS);
                    BigDecimal targetStock = targetByConsumption.max(item.minStock());
                    BigDecimal recommendedQty = targetStock.subtract(item.quantity()).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
                    if (recommendedQty.compareTo(BigDecimal.ZERO) <= 0) {
                        return null;
                    }

                    String priority = priorityForCoverage(item.quantity(), coverage, belowMin);
                    AiReplenishmentSuggestionDto suggestion = new AiReplenishmentSuggestionDto();
                    suggestion.setProductId(item.productId());
                    suggestion.setProductName(item.productName());
                    suggestion.setLocationId(item.locationId());
                    suggestion.setLocationName(item.locationName());
                    suggestion.setBaseUnit(item.baseUnit());
                    suggestion.setCurrentStock(item.quantity());
                    suggestion.setMinStockBaseQty(item.minStock());
                    suggestion.setAverageDailyConsumption(avgDaily);
                    suggestion.setDaysCoverage(coverage);
                    suggestion.setRecommendedQty(recommendedQty);
                    suggestion.setEstimatedCost(recommendedQty.multiply(item.avgUnitCost()).setScale(2, RoundingMode.HALF_UP));
                    suggestion.setPriority(priority);
                    suggestion.setPriorityScore(scoreForPriority(priority));
                    suggestion.setReason(replenishmentReason(item, avgDaily, coverage, belowMin));
                    return suggestion;
                })
                .filter(suggestion -> suggestion != null)
                .toList();
    }

    private AiInsightsMetricsDto buildMetrics(List<AiAlertDto> alerts, List<AiReplenishmentSuggestionDto> replenishment) {
        AiInsightsMetricsDto metrics = new AiInsightsMetricsDto();
        metrics.setTotalAlerts(alerts.size());
        metrics.setCriticalAlerts(countSeverity(alerts, "CRITICAL"));
        metrics.setHighAlerts(countSeverity(alerts, "HIGH"));
        metrics.setLowStockAlerts(countType(alerts, "LOW_STOCK"));
        metrics.setExpirationAlerts(countType(alerts, "EXPIRATION_RISK"));
        metrics.setWasteAlerts(countType(alerts, "WASTE_ANOMALY"));
        metrics.setCountDifferenceAlerts(countType(alerts, "COUNT_DIFFERENCE"));
        metrics.setReplenishmentSuggestions(replenishment.size());
        metrics.setEstimatedReplenishmentCost(replenishment.stream()
                .map(AiReplenishmentSuggestionDto::getEstimatedCost)
                .filter(value -> value != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP));
        metrics.setTopPriority(alerts.isEmpty()
                ? replenishment.stream().findFirst().map(AiReplenishmentSuggestionDto::getReason).orElse("Operacion estable sin prioridades criticas.")
                : alerts.get(0).getRecommendedAction());
        return metrics;
    }

    private String buildExecutiveSummary(AiInsightsMetricsDto metrics,
                                         List<AiAlertDto> alerts,
                                         List<AiReplenishmentSuggestionDto> replenishment,
                                         Map<StockKey, UsageAggregate> wasteByKey) {
        if (metrics.getTotalAlerts() == 0 && metrics.getReplenishmentSuggestions() == 0) {
            return "La operacion luce estable: no hay alertas relevantes ni compras urgentes con los datos del periodo.";
        }

        StringBuilder summary = new StringBuilder();
        summary.append("Se detectaron ")
                .append(metrics.getTotalAlerts())
                .append(" alertas operativas");
        if (metrics.getCriticalAlerts() > 0) {
            summary.append(", incluyendo ").append(metrics.getCriticalAlerts()).append(" criticas");
        }
        summary.append(". ");

        replenishment.stream().findFirst().ifPresent(top -> summary.append("La reposicion mas urgente es ")
                .append(top.getProductName())
                .append(" en ")
                .append(top.getLocationName())
                .append(" con sugerencia de compra de ")
                .append(formatQty(top.getRecommendedQty()))
                .append(" ")
                .append(top.getBaseUnit())
                .append(". "));

        alerts.stream().findFirst().ifPresent(top -> summary.append("Prioridad inmediata: ")
                .append(top.getRecommendedAction()));

        if (!wasteByKey.isEmpty() && metrics.getWasteAlerts() > 0) {
            summary.append(" Tambien conviene revisar las mermas marcadas antes del siguiente cierre.");
        }
        return summary.toString();
    }

    private Flux<StockSnapshot> getStockSnapshots(Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT *
                FROM (
                    SELECT
                        product_id,
                        product_name,
                        category_name,
                        location_id,
                        location_name,
                        base_unit,
                        COALESCE(SUM(quantity_base), 0) AS quantity_base,
                        COALESCE(MAX(min_stock_base_qty), 0) AS min_stock_base_qty,
                        COALESCE(AVG(avg_unit_cost_base), 0) AS avg_unit_cost_base,
                        COALESCE(SUM(total_value), 0) AS total_value
                    FROM vw_inventory_current
                    WHERE 1=1
                """);
        if (locationId != null) {
            sql.append(" AND location_id = ").append(locationId);
        }
        sql.append('\n')
                .append("""
                    GROUP BY product_id, product_name, category_name, location_id, location_name, base_unit

                    UNION ALL

                    SELECT
                        p.product_id,
                        p.product_name,
                        c.category_name,
                        l.location_id,
                        l.location_name,
                        u.unit_code AS base_unit,
                        0::numeric AS quantity_base,
                        p.min_stock_base_qty,
                        0::numeric AS avg_unit_cost_base,
                        0::numeric AS total_value
                    FROM products p
                    JOIN product_categories c ON c.category_id = p.category_id
                    JOIN units_of_measure u ON u.unit_id = p.base_unit_id
                    JOIN locations l ON l.location_id = p.default_location_id
                    WHERE p.is_active = true
                      AND p.min_stock_base_qty > 0
                      AND NOT EXISTS (
                          SELECT 1
                          FROM stock_balances sb
                          WHERE sb.product_id = p.product_id
                            AND sb.location_id = p.default_location_id
                      )
                """);
        if (locationId != null) {
            sql.append(" AND p.default_location_id = ").append(locationId);
        }
        sql.append("""
                ) inventory_snapshot
                ORDER BY product_name ASC
                """);
        return client.sql(sql.toString())
                .map((row, meta) -> new StockSnapshot(
                        row.get("product_id", Long.class),
                        row.get("product_name", String.class),
                        row.get("category_name", String.class),
                        row.get("location_id", Long.class),
                        row.get("location_name", String.class),
                        row.get("base_unit", String.class),
                        valueOrZero(row.get("quantity_base", BigDecimal.class)),
                        valueOrZero(row.get("min_stock_base_qty", BigDecimal.class)),
                        valueOrZero(row.get("avg_unit_cost_base", BigDecimal.class)),
                        valueOrZero(row.get("total_value", BigDecimal.class))
                ))
                .all();
    }

    private Flux<LotSnapshot> getExpiringLots(Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    product_id,
                    product_name,
                    location_id,
                    location_name,
                    base_unit,
                    lot_number,
                    expiration_date,
                    quantity_base
                FROM vw_inventory_current
                WHERE expiration_date IS NOT NULL
                  AND quantity_base > 0
                """);
        if (locationId != null) {
            sql.append(" AND location_id = ").append(locationId);
        }
        sql.append(" ORDER BY expiration_date ASC");
        return client.sql(sql.toString())
                .map((row, meta) -> new LotSnapshot(
                        row.get("product_id", Long.class),
                        row.get("product_name", String.class),
                        row.get("location_id", Long.class),
                        row.get("location_name", String.class),
                        row.get("base_unit", String.class),
                        row.get("lot_number", String.class),
                        row.get("expiration_date", LocalDate.class),
                        valueOrZero(row.get("quantity_base", BigDecimal.class))
                ))
                .all();
    }

    private Flux<UsageAggregate> getUsageAggregates(String viewName, LocalDate from, LocalDate to, Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    v.product_id,
                    v.product_name,
                    COALESCE(src.location_id, tgt.location_id) AS location_id,
                    COALESCE(src.location_name, tgt.location_name, 'Sin ubicacion') AS location_name,
                    v.unit_code AS base_unit,
                    COALESCE(SUM(v.quantity_base), 0) AS total_quantity
                FROM %s v
                LEFT JOIN locations src ON src.location_name = v.source_location
                LEFT JOIN locations tgt ON tgt.location_name = v.target_location
                WHERE v.status = 'POSTED'
                  AND v.transaction_date::date >= '%s'
                  AND v.transaction_date::date <= '%s'
                """.formatted(viewName, from, to));
        if (locationId != null) {
            sql.append(" AND COALESCE(src.location_id, tgt.location_id) = ").append(locationId);
        }
        sql.append('\n')
                .append("""
                GROUP BY v.product_id, v.product_name, COALESCE(src.location_id, tgt.location_id),
                         COALESCE(src.location_name, tgt.location_name, 'Sin ubicacion'), v.unit_code
                ORDER BY total_quantity DESC
                """);
        return client.sql(sql.toString())
                .map((row, meta) -> new UsageAggregate(
                        row.get("product_id", Long.class),
                        row.get("product_name", String.class),
                        row.get("location_id", Long.class),
                        row.get("location_name", String.class),
                        row.get("base_unit", String.class),
                        valueOrZero(row.get("total_quantity", BigDecimal.class))
                ))
                .all();
    }

    private Flux<CountDifferenceSnapshot> getCountDifferences(LocalDate from, LocalDate to, Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT
                    v.physical_count_id,
                    v.count_number,
                    v.location_name,
                    l.location_id,
                    v.product_id,
                    v.product_name,
                    v.theoretical_qty_base,
                    v.actual_qty_base,
                    v.difference_qty_base,
                    v.base_unit
                FROM vw_report_count_differences v
                JOIN locations l ON l.location_name = v.location_name
                WHERE v.count_date::date >= '%s'
                  AND v.count_date::date <= '%s'
                """.formatted(from, to));
        if (locationId != null) {
            sql.append(" AND l.location_id = ").append(locationId);
        }
        sql.append(" ORDER BY ABS(v.difference_qty_base) DESC");
        return client.sql(sql.toString())
                .map((row, meta) -> new CountDifferenceSnapshot(
                        row.get("physical_count_id", Long.class),
                        row.get("count_number", String.class),
                        row.get("location_id", Long.class),
                        row.get("location_name", String.class),
                        row.get("product_id", Long.class),
                        row.get("product_name", String.class),
                        valueOrZero(row.get("theoretical_qty_base", BigDecimal.class)),
                        valueOrZero(row.get("actual_qty_base", BigDecimal.class)),
                        valueOrZero(row.get("difference_qty_base", BigDecimal.class)),
                        row.get("base_unit", String.class)
                ))
                .all();
    }

    private Mono<PendingSalesSnapshot> getPendingSales(LocalDate from, LocalDate to, Long locationId) {
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(*)::int AS sales_count, COALESCE(SUM(total_amount), 0) AS total_amount
                FROM sales
                WHERE status = 'PAID'
                  AND inventory_processed = false
                  AND sale_datetime::date >= '%s'
                  AND sale_datetime::date <= '%s'
                """.formatted(from, to));
        if (locationId != null) {
            sql.append(" AND location_id = ").append(locationId);
        }
        return client.sql(sql.toString())
                .map((row, meta) -> new PendingSalesSnapshot(
                        row.get("sales_count", Integer.class),
                        valueOrZero(row.get("total_amount", BigDecimal.class))
                ))
                .one()
                .defaultIfEmpty(new PendingSalesSnapshot(0, BigDecimal.ZERO));
    }

    private Mono<String> resolveLocationName(Long locationId) {
        if (locationId == null) {
            return Mono.just("Todas las sedes");
        }
        return client.sql("SELECT location_name FROM locations WHERE location_id = " + locationId)
                .map((row, meta) -> row.get("location_name", String.class))
                .one()
                .defaultIfEmpty("Sede " + locationId);
    }

    private Map<StockKey, UsageAggregate> toUsageMap(List<UsageAggregate> rows) {
        Map<StockKey, UsageAggregate> map = new HashMap<>();
        for (UsageAggregate row : rows) {
            map.put(new StockKey(row.productId(), row.locationId()), row);
        }
        return map;
    }

    private AiAlertDto baseProductAlert(String type, String severity, StockSnapshot item, int priorityScore) {
        AiAlertDto alert = new AiAlertDto();
        alert.setType(type);
        alert.setSeverity(severity);
        alert.setProductId(item.productId());
        alert.setProductName(item.productName());
        alert.setLocationId(item.locationId());
        alert.setLocationName(item.locationName());
        alert.setBaseUnit(item.baseUnit());
        alert.setPriorityScore(priorityScore);
        return alert;
    }

    private String priorityForCoverage(BigDecimal stock, BigDecimal coverage, boolean belowMin) {
        if (stock.compareTo(BigDecimal.ZERO) <= 0 || (coverage != null && coverage.compareTo(new BigDecimal("2")) <= 0)) {
            return "CRITICAL";
        }
        if (belowMin || (coverage != null && coverage.compareTo(new BigDecimal("5")) <= 0)) {
            return "HIGH";
        }
        return "MEDIUM";
    }

    private int scoreForPriority(String priority) {
        return switch (priority) {
            case "CRITICAL" -> 100;
            case "HIGH" -> 82;
            default -> 58;
        };
    }

    private String replenishmentReason(StockSnapshot item, BigDecimal avgDaily, BigDecimal coverage, boolean belowMin) {
        if (avgDaily.compareTo(BigDecimal.ZERO) <= 0) {
            return "Esta por debajo del minimo configurado y no hay consumo historico suficiente en el periodo.";
        }
        String coverageText = coverage == null ? "sin cobertura calculable" : formatQty(coverage) + " dias de cobertura";
        if (belowMin) {
            return "Esta por debajo del minimo y tiene consumo promedio de " + formatQty(avgDaily) + " "
                    + item.baseUnit() + " diarios (" + coverageText + ").";
        }
        return "La cobertura estimada es baja: " + coverageText + " con consumo promedio de "
                + formatQty(avgDaily) + " " + item.baseUnit() + " diarios.";
    }

    private int countSeverity(List<AiAlertDto> alerts, String severity) {
        return (int) alerts.stream().filter(alert -> severity.equals(alert.getSeverity())).count();
    }

    private int countType(List<AiAlertDto> alerts, String type) {
        return (int) alerts.stream().filter(alert -> type.equals(alert.getType())).count();
    }

    private BigDecimal valueOrZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private BigDecimal safeDivide(BigDecimal left, BigDecimal right, int scale) {
        if (right == null || right.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return left.divide(right, scale, RoundingMode.HALF_UP);
    }

    private String formatQty(BigDecimal value) {
        if (value == null) {
            return "0";
        }
        return value.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private record StockKey(Long productId, Long locationId) {
    }

    private record StockSnapshot(Long productId, String productName, String categoryName, Long locationId,
                                 String locationName, String baseUnit, BigDecimal quantity, BigDecimal minStock,
                                 BigDecimal avgUnitCost, BigDecimal totalValue) {
    }

    private record LotSnapshot(Long productId, String productName, Long locationId, String locationName,
                               String baseUnit, String lotNumber, LocalDate expirationDate, BigDecimal quantity) {
    }

    private record LotWithDays(LotSnapshot lot, long daysToExpire) {
    }

    private record UsageAggregate(Long productId, String productName, Long locationId, String locationName,
                                  String baseUnit, BigDecimal totalQuantity) {
    }

    private record CountDifferenceSnapshot(Long physicalCountId, String countNumber, Long locationId,
                                           String locationName, Long productId, String productName,
                                           BigDecimal theoretical, BigDecimal actual, BigDecimal difference,
                                           String baseUnit) {
    }

    private record PendingSalesSnapshot(Integer count, BigDecimal totalAmount) {
    }
}
