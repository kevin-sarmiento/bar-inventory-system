package com.bar.inventory.controller;

import com.bar.inventory.dto.AuditHistoryDto;
import com.bar.inventory.dto.CountDifferenceDto;
import com.bar.inventory.dto.InventoryValuationDto;
import com.bar.inventory.dto.MovementReportDto;
import com.bar.inventory.dto.StockViewDto;
import com.bar.inventory.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;

import java.time.LocalDate;

@RestController
@RequestMapping(path = "/api/reports", produces = MediaType.APPLICATION_JSON_VALUE)
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/stock")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<StockViewDto> currentStock(@RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.getCurrentStock(locationId);
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<MovementReportDto> movements(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "type", required = false) String type) {
        return reportService.getMovements(from, to, type);
    }

    @GetMapping("/waste")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<MovementReportDto> waste(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getWaste(from, to);
    }

    @GetMapping("/consumption")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<MovementReportDto> consumption(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getConsumption(from, to);
    }

    @GetMapping("/count-differences")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<CountDifferenceDto> countDifferences() {
        return reportService.getCountDifferences();
    }

    @GetMapping("/inventory-valuation")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<InventoryValuationDto> inventoryValuation() {
        return reportService.getInventoryValuation();
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<AuditHistoryDto> auditHistory() {
        return reportService.getAuditHistory();
    }
}
