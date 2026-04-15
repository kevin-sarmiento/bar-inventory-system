package com.bar.inventory.dto;

import java.math.BigDecimal;

public class InventoryValuationDto {
    private Long productId;
    private String productName;
    private String categoryName;
    private Long locationId;
    private String locationName;
    private String baseUnit;
    private BigDecimal totalQtyBase;
    private BigDecimal avgCostBase;
    private BigDecimal totalInventoryValue;

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

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
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

    public BigDecimal getTotalQtyBase() {
        return totalQtyBase;
    }

    public void setTotalQtyBase(BigDecimal totalQtyBase) {
        this.totalQtyBase = totalQtyBase;
    }

    public BigDecimal getAvgCostBase() {
        return avgCostBase;
    }

    public void setAvgCostBase(BigDecimal avgCostBase) {
        this.avgCostBase = avgCostBase;
    }

    public BigDecimal getTotalInventoryValue() {
        return totalInventoryValue;
    }

    public void setTotalInventoryValue(BigDecimal totalInventoryValue) {
        this.totalInventoryValue = totalInventoryValue;
    }
}
