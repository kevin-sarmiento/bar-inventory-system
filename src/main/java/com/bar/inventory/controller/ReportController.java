package com.bar.inventory.controller;

import com.bar.inventory.dto.AuditHistoryDto;
import com.bar.inventory.dto.CountDifferenceDto;
import com.bar.inventory.dto.DashboardSummaryDto;
import com.bar.inventory.dto.InventoryValuationDto;
import com.bar.inventory.dto.MovementReportDto;
import com.bar.inventory.dto.ShiftReportDto;
import com.bar.inventory.dto.ShiftSalesByLocationDto;
import com.bar.inventory.dto.ShiftSalesByUserDto;
import com.bar.inventory.dto.StockViewDto;
import com.bar.inventory.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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

    @GetMapping("/dashboard/daily")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<DashboardSummaryDto> dailyDashboard(
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.getDailyDashboard(date, locationId);
    }

    @GetMapping(value = "/stock/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<ResponseEntity<byte[]>> exportCurrentStockXlsx(
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.exportCurrentStockXlsx(locationId)
                .map(content -> xlsxResponse("stock-report.xlsx", content));
    }

    @GetMapping("/movements")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<MovementReportDto> movements(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "type", required = false) String type) {
        return reportService.getMovements(from, to, type);
    }

    @GetMapping(value = "/movements/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<ResponseEntity<byte[]>> exportMovementsXlsx(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "type", required = false) String type) {
        return reportService.exportMovementsXlsx(from, to, type)
                .map(content -> xlsxResponse("movements-report.xlsx", content));
    }

    @GetMapping("/waste")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<MovementReportDto> waste(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getWaste(from, to);
    }

    @GetMapping(value = "/waste/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<ResponseEntity<byte[]>> exportWasteXlsx(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.exportWasteXlsx(from, to)
                .map(content -> xlsxResponse("waste-report.xlsx", content));
    }

    @GetMapping("/consumption")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<MovementReportDto> consumption(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.getConsumption(from, to);
    }

    @GetMapping(value = "/consumption/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<ResponseEntity<byte[]>> exportConsumptionXlsx(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return reportService.exportConsumptionXlsx(from, to)
                .map(content -> xlsxResponse("consumption-report.xlsx", content));
    }

    @GetMapping("/count-differences")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<CountDifferenceDto> countDifferences() {
        return reportService.getCountDifferences();
    }

    @GetMapping(value = "/count-differences/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<ResponseEntity<byte[]>> exportCountDifferencesXlsx() {
        return reportService.exportCountDifferencesXlsx()
                .map(content -> xlsxResponse("count-differences.xlsx", content));
    }

    @GetMapping("/inventory-valuation")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Flux<InventoryValuationDto> inventoryValuation() {
        return reportService.getInventoryValuation();
    }

    @GetMapping(value = "/inventory-valuation/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO')")
    public Mono<ResponseEntity<byte[]>> exportInventoryValuationXlsx() {
        return reportService.exportInventoryValuationXlsx()
                .map(content -> xlsxResponse("inventory-valuation.xlsx", content));
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<AuditHistoryDto> auditHistory() {
        return reportService.getAuditHistory();
    }

    @GetMapping(value = "/audit/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<byte[]>> exportAuditHistoryXlsx() {
        return reportService.exportAuditHistoryXlsx()
                .map(content -> xlsxResponse("audit-history.xlsx", content));
    }

    @GetMapping("/shifts")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<ShiftReportDto> shiftSummary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.getShiftSummary(from, to, userId, locationId);
    }

    @GetMapping("/shifts/by-user")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<ShiftSalesByUserDto> shiftSalesByUser(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.getShiftSalesByUser(from, to, locationId);
    }

    @GetMapping("/shifts/by-location")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<ShiftSalesByLocationDto> shiftSalesByLocation(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "userId", required = false) Long userId) {
        return reportService.getShiftSalesByLocation(from, to, userId);
    }

    @GetMapping(value = "/shifts/export", produces = "text/csv")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<String>> exportShiftSummary(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.exportShiftSummaryCsv(from, to, userId, locationId)
                .map(csv -> csvResponse("shift-summary.csv", csv));
    }

    @GetMapping(value = "/shifts/by-user/export", produces = "text/csv")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<String>> exportShiftSalesByUser(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.exportShiftSalesByUserCsv(from, to, locationId)
                .map(csv -> csvResponse("shift-sales-by-user.csv", csv));
    }

    @GetMapping(value = "/shifts/by-location/export", produces = "text/csv")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<String>> exportShiftSalesByLocation(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "userId", required = false) Long userId) {
        return reportService.exportShiftSalesByLocationCsv(from, to, userId)
                .map(csv -> csvResponse("shift-sales-by-location.csv", csv));
    }

    private ResponseEntity<String> csvResponse(String filename, String csv) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }

    @GetMapping(value = "/shifts/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<byte[]>> exportShiftSummaryXlsx(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "userId", required = false) Long userId,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.exportShiftSummaryXlsx(from, to, userId, locationId)
                .map(content -> xlsxResponse("shift-summary.xlsx", content));
    }

    @GetMapping(value = "/shifts/by-user/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<byte[]>> exportShiftSalesByUserXlsx(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.exportShiftSalesByUserXlsx(from, to, locationId)
                .map(content -> xlsxResponse("shift-sales-by-user.xlsx", content));
    }

    @GetMapping(value = "/shifts/by-location/export.xlsx", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ResponseEntity<byte[]>> exportShiftSalesByLocationXlsx(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "userId", required = false) Long userId) {
        return reportService.exportShiftSalesByLocationXlsx(from, to, userId)
                .map(content -> xlsxResponse("shift-sales-by-location.xlsx", content));
    }

    private ResponseEntity<byte[]> xlsxResponse(String filename, byte[] content) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(content);
    }
}
