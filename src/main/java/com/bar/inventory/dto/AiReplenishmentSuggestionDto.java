package com.bar.inventory.dto;

import java.math.BigDecimal;

public class AiReplenishmentSuggestionDto {
    private Long productId;
    private String productName;
    private Long locationId;
    private String locationName;
    private String baseUnit;
    private BigDecimal currentStock;
    private BigDecimal minStockBaseQty;
    private BigDecimal averageDailyConsumption;
    private BigDecimal daysCoverage;
    private BigDecimal recommendedQty;
    private BigDecimal estimatedCost;
    private String priority;
    private Integer priorityScore;
    private String reason;

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public String getProductName() {
        return productName;
    }

    public void setProductName(String productName) {
        this.productName = productName;
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

    public String getBaseUnit() {
        return baseUnit;
    }

    public void setBaseUnit(String baseUnit) {
        this.baseUnit = baseUnit;
    }

    public BigDecimal getCurrentStock() {
        return currentStock;
    }

    public void setCurrentStock(BigDecimal currentStock) {
        this.currentStock = currentStock;
    }

    public BigDecimal getMinStockBaseQty() {
        return minStockBaseQty;
    }

    public void setMinStockBaseQty(BigDecimal minStockBaseQty) {
        this.minStockBaseQty = minStockBaseQty;
    }

    public BigDecimal getAverageDailyConsumption() {
        return averageDailyConsumption;
    }

    public void setAverageDailyConsumption(BigDecimal averageDailyConsumption) {
        this.averageDailyConsumption = averageDailyConsumption;
    }

    public BigDecimal getDaysCoverage() {
        return daysCoverage;
    }

    public void setDaysCoverage(BigDecimal daysCoverage) {
        this.daysCoverage = daysCoverage;
    }

    public BigDecimal getRecommendedQty() {
        return recommendedQty;
    }

    public void setRecommendedQty(BigDecimal recommendedQty) {
        this.recommendedQty = recommendedQty;
    }

    public BigDecimal getEstimatedCost() {
        return estimatedCost;
    }

    public void setEstimatedCost(BigDecimal estimatedCost) {
        this.estimatedCost = estimatedCost;
    }

    public String getPriority() {
        return priority;
    }

    public void setPriority(String priority) {
        this.priority = priority;
    }

    public Integer getPriorityScore() {
        return priorityScore;
    }

    public void setPriorityScore(Integer priorityScore) {
        this.priorityScore = priorityScore;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
