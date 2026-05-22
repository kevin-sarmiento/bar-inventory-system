package com.bar.inventory.service;

import com.bar.inventory.dto.AiAlertDto;
import com.bar.inventory.dto.AiInsightsMetricsDto;
import com.bar.inventory.dto.AiInsightsResponseDto;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AiInsightsScopeService {
    private static final Set<String> MANAGEMENT_ROLES = Set.of("ADMINISTRADOR", "GERENTE", "INVENTARIO");
    private static final Set<String> BARTENDER_ALERT_TYPES = Set.of("LOW_STOCK", "EXPIRATION_RISK");
    private static final Set<String> OPERATIONAL_LOCATION_TYPES = Set.of("BAR", "KITCHEN", "FRIDGE", "AUXILIARY");

    private final DatabaseClient client;

    public AiInsightsScopeService(DatabaseClient client) {
        this.client = client;
    }

    public Mono<List<String>> currentRoles() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication().getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .map(authority -> authority.startsWith("ROLE_") ? authority.substring(5) : authority)
                        .toList())
                .defaultIfEmpty(List.of());
    }

    public boolean isBartenderOperationalOnly(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            return false;
        }
        boolean hasBartender = roles.contains("BARTENDER");
        boolean hasManagement = roles.stream().anyMatch(MANAGEMENT_ROLES::contains);
        return hasBartender && !hasManagement;
    }

    public boolean allowsWebSearch(List<String> roles) {
        return !isBartenderOperationalOnly(roles);
    }

    public Mono<AiInsightsResponseDto> applyScope(AiInsightsResponseDto response, List<String> roles) {
        if (!isBartenderOperationalOnly(roles)) {
            return Mono.just(response);
        }
        return operationalLocationIds()
                .map(locationIds -> filterForBartender(response, locationIds));
    }

    public Mono<AiInsightsResponseDto> applyScope(Mono<AiInsightsResponseDto> responseMono) {
        return Mono.zip(responseMono, currentRoles())
                .flatMap(tuple -> applyScope(tuple.getT1(), tuple.getT2()));
    }

    private Mono<Set<Long>> operationalLocationIds() {
        String types = OPERATIONAL_LOCATION_TYPES.stream()
                .map(type -> "'" + type + "'")
                .collect(Collectors.joining(", "));
        return client.sql("""
                        SELECT location_id
                        FROM locations
                        WHERE is_active = TRUE
                          AND location_type IN (%s)
                        """.formatted(types))
                .map((row, metadata) -> row.get("location_id", Long.class))
                .all()
                .collect(Collectors.toSet());
    }

    private AiInsightsResponseDto filterForBartender(AiInsightsResponseDto response, Set<Long> operationalLocationIds) {
        List<AiAlertDto> alerts = response.getAlerts() == null ? List.of() : response.getAlerts().stream()
                .filter(alert -> BARTENDER_ALERT_TYPES.contains(alert.getType()))
                .filter(alert -> isOperationalLocation(alert.getLocationId(), operationalLocationIds))
                .map(this::sanitizeBartenderAlert)
                .toList();

        AiInsightsResponseDto scoped = copyHeader(response);
        scoped.setAlerts(alerts);
        scoped.setReplenishmentSuggestions(List.of());
        scoped.setMetrics(buildBartenderMetrics(alerts));
        scoped.setExecutiveSummary(buildBartenderExecutiveSummary(alerts));
        return scoped;
    }

    private AiInsightsResponseDto copyHeader(AiInsightsResponseDto source) {
        AiInsightsResponseDto target = new AiInsightsResponseDto();
        target.setFromDate(source.getFromDate());
        target.setToDate(source.getToDate());
        target.setLocationId(source.getLocationId());
        target.setLocationName(source.getLocationName());
        target.setGeneratedAt(source.getGeneratedAt());
        return target;
    }

    private boolean isOperationalLocation(Long locationId, Set<Long> operationalLocationIds) {
        if (locationId == null) {
            return true;
        }
        return operationalLocationIds.contains(locationId);
    }

    private AiAlertDto sanitizeBartenderAlert(AiAlertDto alert) {
        if ("LOW_STOCK".equals(alert.getType())) {
            alert.setRecommendedAction(
                    "Prioriza el servicio con productos disponibles y avisa a inventario o gerencia si falta insumo en barra.");
        }
        return alert;
    }

    private AiInsightsMetricsDto buildBartenderMetrics(List<AiAlertDto> alerts) {
        AiInsightsMetricsDto metrics = new AiInsightsMetricsDto();
        metrics.setTotalAlerts(alerts.size());
        metrics.setCriticalAlerts(countSeverity(alerts, "CRITICAL"));
        metrics.setHighAlerts(countSeverity(alerts, "HIGH"));
        metrics.setLowStockAlerts(countType(alerts, "LOW_STOCK"));
        metrics.setExpirationAlerts(countType(alerts, "EXPIRATION_RISK"));
        metrics.setWasteAlerts(0);
        metrics.setCountDifferenceAlerts(0);
        metrics.setReplenishmentSuggestions(0);
        metrics.setEstimatedReplenishmentCost(null);
        metrics.setTopPriority(alerts.isEmpty()
                ? "Sin urgencias operativas en barra para el periodo."
                : alerts.get(0).getRecommendedAction());
        return metrics;
    }

    private String buildBartenderExecutiveSummary(List<AiAlertDto> alerts) {
        if (alerts.isEmpty()) {
            return "Barra operativa: no hay alertas de stock bajo ni vencimientos proximos en las areas de servicio.";
        }
        long lowStock = countType(alerts, "LOW_STOCK");
        long expiring = countType(alerts, "EXPIRATION_RISK");
        StringBuilder summary = new StringBuilder("Vista de barra: ");
        if (lowStock > 0) {
            summary.append(lowStock).append(lowStock == 1 ? " producto con stock bajo" : " productos con stock bajo");
        }
        if (expiring > 0) {
            if (lowStock > 0) {
                summary.append(" y ");
            }
            summary.append(expiring).append(expiring == 1 ? " lote por vencer" : " lotes por vencer");
        }
        summary.append(". ");
        summary.append("Prioridad: ").append(alerts.get(0).getRecommendedAction());
        return summary.toString();
    }

    private int countSeverity(List<AiAlertDto> alerts, String severity) {
        return (int) alerts.stream().filter(alert -> severity.equals(alert.getSeverity())).count();
    }

    private int countType(List<AiAlertDto> alerts, String type) {
        return (int) alerts.stream().filter(alert -> type.equals(alert.getType())).count();
    }
}
