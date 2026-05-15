package com.bar.inventory.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class AiInsightsResponseDto {
    private LocalDate fromDate;
    private LocalDate toDate;
    private Long locationId;
    private String locationName;
    private Instant generatedAt;
    private String executiveSummary;
    private AiInsightsMetricsDto metrics;
    private List<AiAlertDto> alerts;
    private List<AiReplenishmentSuggestionDto> replenishmentSuggestions;

    public LocalDate getFromDate() {
        return fromDate;
    }

    public void setFromDate(LocalDate fromDate) {
        this.fromDate = fromDate;
    }

    public LocalDate getToDate() {
        return toDate;
    }

    public void setToDate(LocalDate toDate) {
        this.toDate = toDate;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public String getLocationName() {
        return locationName;
    }

    public void setLocationName(String locationName) {
        this.locationName = locationName;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getExecutiveSummary() {
        return executiveSummary;
    }

    public void setExecutiveSummary(String executiveSummary) {
        this.executiveSummary = executiveSummary;
    }

    public AiInsightsMetricsDto getMetrics() {
        return metrics;
    }

    public void setMetrics(AiInsightsMetricsDto metrics) {
        this.metrics = metrics;
    }

    public List<AiAlertDto> getAlerts() {
        return alerts;
    }

    public void setAlerts(List<AiAlertDto> alerts) {
        this.alerts = alerts;
    }

    public List<AiReplenishmentSuggestionDto> getReplenishmentSuggestions() {
        return replenishmentSuggestions;
    }

    public void setReplenishmentSuggestions(List<AiReplenishmentSuggestionDto> replenishmentSuggestions) {
        this.replenishmentSuggestions = replenishmentSuggestions;
    }
}
