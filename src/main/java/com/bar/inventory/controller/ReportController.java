package com.bar.inventory.controller;

import com.bar.inventory.dto.MovementReportDto;
import com.bar.inventory.dto.StockViewDto;
import com.bar.inventory.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
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
    public Flux<StockViewDto> currentStock(@RequestParam(value = "locationId", required = false) Long locationId) {
        return reportService.getCurrentStock(locationId);
    }

    @GetMapping("/movements")
    public Flux<MovementReportDto> movements(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "type", required = false) String type) {
        return reportService.getMovements(from, to, type);
    }
}
