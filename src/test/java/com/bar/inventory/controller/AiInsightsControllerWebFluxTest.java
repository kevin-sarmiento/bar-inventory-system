package com.bar.inventory.controller;

import com.bar.inventory.config.GlobalExceptionHandler;
import com.bar.inventory.dto.AiAlertDto;
import com.bar.inventory.dto.AiChatRequestDto;
import com.bar.inventory.dto.AiChatResponseDto;
import com.bar.inventory.dto.AiInsightsMetricsDto;
import com.bar.inventory.dto.AiInsightsResponseDto;
import com.bar.inventory.dto.AiReplenishmentSuggestionDto;
import com.bar.inventory.service.AiChatService;
import com.bar.inventory.service.AiInsightsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveUserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@WebFluxTest(
        controllers = AiInsightsController.class,
        excludeAutoConfiguration = {
                ReactiveSecurityAutoConfiguration.class,
                ReactiveUserDetailsServiceAutoConfiguration.class
        }
)
@Import(GlobalExceptionHandler.class)
class AiInsightsControllerWebFluxTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private AiInsightsService aiInsightsService;

    @MockBean
    private AiChatService aiChatService;

    @Test
    void insightsShouldReturnOperationalRecommendations() {
        when(aiInsightsService.getInsights(eq(LocalDate.of(2026, 4, 1)), eq(LocalDate.of(2026, 4, 15)), eq(1L)))
                .thenReturn(Mono.just(responseDto()));

        webTestClient.get()
                .uri("/api/ai/insights?from=2026-04-01&to=2026-04-15&locationId=1")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.locationName").isEqualTo("Bodega Principal")
                .jsonPath("$.metrics.totalAlerts").isEqualTo(1)
                .jsonPath("$.alerts[0].type").isEqualTo("LOW_STOCK")
                .jsonPath("$.replenishmentSuggestions[0].productName").isEqualTo("Ron blanco");
    }

    @Test
    void chatShouldReturnOllamaAnswer() {
        AiChatResponseDto response = new AiChatResponseDto();
        response.setAnswer("Compra primero Ron blanco porque esta en stock critico.");
        response.setModel("llama3.2:3b");
        response.setGeneratedAt(Instant.parse("2026-04-15T20:05:00Z"));
        response.setContextSummary("Hay una reposicion critica.");

        when(aiChatService.chat(org.mockito.ArgumentMatchers.any(AiChatRequestDto.class)))
                .thenReturn(Mono.just(response));

        webTestClient.post()
                .uri("/api/ai/chat")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                        {
                          "message": "Que debo comprar primero?",
                          "from": "2026-04-01",
                          "to": "2026-04-15",
                          "locationId": 1
                        }
                        """)
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.model").isEqualTo("llama3.2:3b")
                .jsonPath("$.answer").isEqualTo("Compra primero Ron blanco porque esta en stock critico.");
    }

    private AiInsightsResponseDto responseDto() {
        AiAlertDto alert = new AiAlertDto();
        alert.setType("LOW_STOCK");
        alert.setSeverity("CRITICAL");
        alert.setTitle("Stock bajo: Ron blanco");
        alert.setMessage("El producto esta por debajo del minimo.");
        alert.setRecommendedAction("Priorizar reposicion.");
        alert.setProductId(1L);
        alert.setProductName("Ron blanco");
        alert.setLocationId(1L);
        alert.setLocationName("Bodega Principal");
        alert.setBaseUnit("ml");
        alert.setQuantity(new BigDecimal("100.00"));
        alert.setThreshold(new BigDecimal("750.00"));
        alert.setPriorityScore(100);

        AiReplenishmentSuggestionDto suggestion = new AiReplenishmentSuggestionDto();
        suggestion.setProductId(1L);
        suggestion.setProductName("Ron blanco");
        suggestion.setLocationId(1L);
        suggestion.setLocationName("Bodega Principal");
        suggestion.setBaseUnit("ml");
        suggestion.setCurrentStock(new BigDecimal("100.00"));
        suggestion.setMinStockBaseQty(new BigDecimal("750.00"));
        suggestion.setAverageDailyConsumption(new BigDecimal("250.00"));
        suggestion.setDaysCoverage(new BigDecimal("0.40"));
        suggestion.setRecommendedQty(new BigDecimal("2400.00"));
        suggestion.setEstimatedCost(new BigDecimal("120000.00"));
        suggestion.setPriority("CRITICAL");
        suggestion.setPriorityScore(100);
        suggestion.setReason("Cobertura critica.");

        AiInsightsMetricsDto metrics = new AiInsightsMetricsDto();
        metrics.setTotalAlerts(1);
        metrics.setCriticalAlerts(1);
        metrics.setHighAlerts(0);
        metrics.setLowStockAlerts(1);
        metrics.setExpirationAlerts(0);
        metrics.setWasteAlerts(0);
        metrics.setCountDifferenceAlerts(0);
        metrics.setReplenishmentSuggestions(1);
        metrics.setEstimatedReplenishmentCost(new BigDecimal("120000.00"));
        metrics.setTopPriority("Priorizar reposicion.");

        AiInsightsResponseDto response = new AiInsightsResponseDto();
        response.setFromDate(LocalDate.of(2026, 4, 1));
        response.setToDate(LocalDate.of(2026, 4, 15));
        response.setLocationId(1L);
        response.setLocationName("Bodega Principal");
        response.setGeneratedAt(Instant.parse("2026-04-15T20:00:00Z"));
        response.setExecutiveSummary("Hay una reposicion critica.");
        response.setMetrics(metrics);
        response.setAlerts(List.of(alert));
        response.setReplenishmentSuggestions(List.of(suggestion));
        return response;
    }
}
