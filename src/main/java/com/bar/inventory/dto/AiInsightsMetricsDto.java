package com.bar.inventory.dto;

import java.math.BigDecimal;

public class AiInsightsMetricsDto {
    private Integer totalAlerts;
    private Integer criticalAlerts;
    private Integer highAlerts;
    private Integer lowStockAlerts;
    private Integer expirationAlerts;
    private Integer wasteAlerts;
    private Integer countDifferenceAlerts;
    private Integer replenishmentSuggestions;
    private BigDecimal estimatedReplenishmentCost;
    private String topPriority;

    public Integer getTotalAlerts() {
        return totalAlerts;
    }

    public void setTotalAlerts(Integer totalAlerts) {
        this.totalAlerts = totalAlerts;
    }

    public Integer getCriticalAlerts() {
        return criticalAlerts;
    }

    public void setCriticalAlerts(Integer criticalAlerts) {
        this.criticalAlerts = criticalAlerts;
    }

    public Integer getHighAlerts() {
        return highAlerts;
    }

    public void setHighAlerts(Integer highAlerts) {
        this.highAlerts = highAlerts;
    }

    public Integer getLowStockAlerts() {
        return lowStockAlerts;
    }

    public void setLowStockAlerts(Integer lowStockAlerts) {
        this.lowStockAlerts = lowStockAlerts;
    }

    public Integer getExpirationAlerts() {
        return expirationAlerts;
    }

    public void setExpirationAlerts(Integer expirationAlerts) {
        this.expirationAlerts = expirationAlerts;
    }

    public Integer getWasteAlerts() {
        return wasteAlerts;
    }

    public void setWasteAlerts(Integer wasteAlerts) {
        this.wasteAlerts = wasteAlerts;
    }

    public Integer getCountDifferenceAlerts() {
        return countDifferenceAlerts;
    }

    public void setCountDifferenceAlerts(Integer countDifferenceAlerts) {
        this.countDifferenceAlerts = countDifferenceAlerts;
    }

    public Integer getReplenishmentSuggestions() {
        return replenishmentSuggestions;
    }

    public void setReplenishmentSuggestions(Integer replenishmentSuggestions) {
        this.replenishmentSuggestions = replenishmentSuggestions;
    }

    public BigDecimal getEstimatedReplenishmentCost() {
        return estimatedReplenishmentCost;
    }

    public void setEstimatedReplenishmentCost(BigDecimal estimatedReplenishmentCost) {
        this.estimatedReplenishmentCost = estimatedReplenishmentCost;
    }

    public String getTopPriority() {
        return topPriority;
    }

    public void setTopPriority(String topPriority) {
        this.topPriority = topPriority;
    }
}
