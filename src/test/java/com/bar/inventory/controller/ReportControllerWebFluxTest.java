package com.bar.inventory.controller;

import com.bar.inventory.config.GlobalExceptionHandler;
import com.bar.inventory.dto.DashboardHourlySalesDto;
import com.bar.inventory.dto.DashboardSummaryDto;
import com.bar.inventory.dto.DashboardTopProductDto;
import com.bar.inventory.dto.DashboardTopUserDto;
import com.bar.inventory.service.ReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveUserDetailsServiceAutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@WebFluxTest(
        controllers = ReportController.class,
        excludeAutoConfiguration = {
                ReactiveSecurityAutoConfiguration.class,
                ReactiveUserDetailsServiceAutoConfiguration.class
        }
)
@Import(GlobalExceptionHandler.class)
class ReportControllerWebFluxTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private ReportService reportService;

    @Test
    void dailyDashboardShouldReturnExecutiveData() {
        when(reportService.getDailyDashboard(eq(LocalDate.of(2026, 4, 15)), eq(1L)))
                .thenReturn(Mono.just(dashboardDto()));

        webTestClient.get()
                .uri("/api/reports/dashboard/daily?date=2026-04-15&locationId=1")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$.locationName").isEqualTo("Bodega Principal")
                .jsonPath("$.salesTotal").isEqualTo(55.0)
                .jsonPath("$.topProducts[0].menuItemName").isEqualTo("Mojito")
                .jsonPath("$.topUsers[0].username").isEqualTo("cajero1")
                .jsonPath("$.hourlySales[0].hourOfDay").isEqualTo(20);
    }

    @Test
    void stockExportShouldReturnXlsxHeaders() {
        when(reportService.exportCurrentStockXlsx(any())).thenReturn(Mono.just(new byte[]{0x50, 0x4B, 0x03, 0x04}));

        webTestClient.get()
                .uri("/api/reports/stock/export.xlsx?locationId=1")
                .exchange()
                .expectStatus().isOk()
                .expectHeader().contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .expectHeader().valueEquals("Content-Disposition", "attachment; filename=\"stock-report.xlsx\"")
                .expectBody(byte[].class)
                .isEqualTo(new byte[]{0x50, 0x4B, 0x03, 0x04});
    }

    private DashboardSummaryDto dashboardDto() {
        DashboardTopProductDto topProduct = new DashboardTopProductDto();
        topProduct.setMenuItemId(1L);
        topProduct.setMenuItemName("Mojito");
        topProduct.setQuantitySold(2);
        topProduct.setTotalSold(new BigDecimal("55.00"));

        DashboardTopUserDto topUser = new DashboardTopUserDto();
        topUser.setUserId(6L);
        topUser.setUsername("cajero1");
        topUser.setFullName("Caja Principal");
        topUser.setSalesCount(2);
        topUser.setTotalSold(new BigDecimal("55.00"));

        DashboardHourlySalesDto hourly = new DashboardHourlySalesDto();
        hourly.setHourOfDay(20);
        hourly.setSalesCount(2);
        hourly.setTotalSold(new BigDecimal("55.00"));

        DashboardSummaryDto dto = new DashboardSummaryDto();
        dto.setReportDate(LocalDate.of(2026, 4, 15));
        dto.setLocationId(1L);
        dto.setLocationName("Bodega Principal");
        dto.setSalesCount(2);
        dto.setSalesTotal(new BigDecimal("55.00"));
        dto.setAverageTicket(new BigDecimal("27.50"));
        dto.setActiveShifts(2);
        dto.setScheduledShifts(0);
        dto.setCompletedShifts(1);
        dto.setLowStockItems(0);
        dto.setInventoryValue(new BigDecimal("150.00"));
        dto.setWasteMovementsCount(0);
        dto.setWasteQuantity(BigDecimal.ZERO);
        dto.setConsumptionMovementsCount(0);
        dto.setConsumptionQuantity(BigDecimal.ZERO);
        dto.setTopProducts(List.of(topProduct));
        dto.setTopUsers(List.of(topUser));
        dto.setHourlySales(List.of(hourly));
        return dto;
    }
}
