package com.bar.inventory.service;

import com.bar.inventory.dto.AiAlertDto;
import com.bar.inventory.dto.AiInsightsMetricsDto;
import com.bar.inventory.dto.AiInsightsResponseDto;
import com.bar.inventory.dto.AiReplenishmentSuggestionDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.r2dbc.core.RowsFetchSpec;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiInsightsScopeServiceTest {

    @Mock
    private DatabaseClient client;

    @Mock
    private DatabaseClient.GenericExecuteSpec executeSpec;

    @Mock
    private RowsFetchSpec<Long> rowsFetchSpec;

    private AiInsightsScopeService service;

    @BeforeEach
    void setUp() {
        service = new AiInsightsScopeService(client);
    }

    @Test
    void isBartenderOperationalOnlyShouldBeTrueOnlyForPureBartender() {
        assertThat(service.isBartenderOperationalOnly(List.of("BARTENDER"))).isTrue();
        assertThat(service.isBartenderOperationalOnly(List.of("BARTENDER", "INVENTARIO"))).isFalse();
        assertThat(service.isBartenderOperationalOnly(List.of("GERENTE"))).isFalse();
    }

    @Test
    void applyScopeShouldHideSensitiveInsightsForBartender() {
        stubOperationalLocations(1L, 2L);

        AiInsightsResponseDto full = fullInsights();
        StepVerifier.create(service.applyScope(full, List.of("BARTENDER")))
                .assertNext(scoped -> {
                    assertThat(scoped.getReplenishmentSuggestions()).isEmpty();
                    assertThat(scoped.getAlerts()).hasSize(2);
                    assertThat(scoped.getAlerts()).extracting(AiAlertDto::getType)
                            .containsExactly("LOW_STOCK", "EXPIRATION_RISK");
                    assertThat(scoped.getMetrics().getEstimatedReplenishmentCost()).isNull();
                    assertThat(scoped.getMetrics().getWasteAlerts()).isZero();
                    assertThat(scoped.getExecutiveSummary()).contains("Vista de barra");
                })
                .verifyComplete();
    }

    @Test
    void applyScopeShouldKeepFullInsightsForManagementRoles() {
        AiInsightsResponseDto full = fullInsights();
        StepVerifier.create(service.applyScope(full, List.of("GERENTE")))
                .assertNext(scoped -> assertThat(scoped).isSameAs(full))
                .verifyComplete();
    }

    private void stubOperationalLocations(Long... ids) {
        when(client.sql(anyString())).thenReturn(executeSpec);
        when(executeSpec.map(org.mockito.ArgumentMatchers.<java.util.function.BiFunction<io.r2dbc.spi.Row, io.r2dbc.spi.RowMetadata, Long>>any()))
                .thenReturn(rowsFetchSpec);
        when(rowsFetchSpec.all()).thenReturn(Flux.fromArray(ids));
    }

    private AiInsightsResponseDto fullInsights() {
        AiAlertDto warehouseStock = alert("LOW_STOCK", 99L, "Bodega");
        AiAlertDto barStock = alert("LOW_STOCK", 1L, "Barra");
        AiAlertDto expiration = alert("EXPIRATION_RISK", 1L, "Barra");
        AiAlertDto waste = alert("WASTE_ANOMALY", 1L, "Barra");
        AiAlertDto countDiff = alert("COUNT_DIFFERENCE", 1L, "Barra");

        AiReplenishmentSuggestionDto replenishment = new AiReplenishmentSuggestionDto();
        replenishment.setProductName("Ron");
        replenishment.setEstimatedCost(new BigDecimal("50000"));

        AiInsightsMetricsDto metrics = new AiInsightsMetricsDto();
        metrics.setTotalAlerts(5);
        metrics.setReplenishmentSuggestions(1);
        metrics.setEstimatedReplenishmentCost(new BigDecimal("50000"));

        AiInsightsResponseDto response = new AiInsightsResponseDto();
        response.setFromDate(LocalDate.of(2026, 4, 1));
        response.setToDate(LocalDate.of(2026, 4, 15));
        response.setGeneratedAt(Instant.parse("2026-04-15T20:00:00Z"));
        response.setAlerts(List.of(warehouseStock, barStock, expiration, waste, countDiff));
        response.setReplenishmentSuggestions(List.of(replenishment));
        response.setMetrics(metrics);
        response.setExecutiveSummary("Resumen completo con compras.");
        return response;
    }

    private AiAlertDto alert(String type, Long locationId, String locationName) {
        AiAlertDto alert = new AiAlertDto();
        alert.setType(type);
        alert.setSeverity("HIGH");
        alert.setTitle("Alerta " + type);
        alert.setMessage("Detalle");
        alert.setRecommendedAction("Accion original");
        alert.setLocationId(locationId);
        alert.setLocationName(locationName);
        alert.setPriorityScore(80);
        return alert;
    }
}
