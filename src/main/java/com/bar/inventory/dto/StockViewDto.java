package com.bar.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class StockViewDto {
    private Long stockBalanceId;
    private Long productId;
    private String productName;
    private String categoryName;
    private Long locationId;
    private String locationName;
    private String baseUnit;
    private String lotNumber;
    private LocalDate expirationDate;
    private BigDecimal quantityBase;
    private BigDecimal minStockBaseQty;
    private Boolean belowMinStock;
    private BigDecimal avgUnitCostBase;
    private BigDecimal totalValue;

    public Long getStockBalanceId() {
        return stockBalanceId;
    }

    public void setStockBalanceId(Long stockBalanceId) {
        this.stockBalanceId = stockBalanceId;
    }

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

    public String getLotNumber() {
        return lotNumber;
    }

    public void setLotNumber(String lotNumber) {
        this.lotNumber = lotNumber;
    }

    public LocalDate getExpirationDate() {
        return expirationDate;
    }

    public void setExpirationDate(LocalDate expirationDate) {
        this.expirationDate = expirationDate;
    }

    public BigDecimal getQuantityBase() {
        return quantityBase;
    }

    public void setQuantityBase(BigDecimal quantityBase) {
        this.quantityBase = quantityBase;
    }

    public BigDecimal getMinStockBaseQty() {
        return minStockBaseQty;
    }

    public void setMinStockBaseQty(BigDecimal minStockBaseQty) {
        this.minStockBaseQty = minStockBaseQty;
    }

    public Boolean getBelowMinStock() {
        return belowMinStock;
    }

    public void setBelowMinStock(Boolean belowMinStock) {
        this.belowMinStock = belowMinStock;
    }

    public BigDecimal getAvgUnitCostBase() {
        return avgUnitCostBase;
    }

    public void setAvgUnitCostBase(BigDecimal avgUnitCostBase) {
        this.avgUnitCostBase = avgUnitCostBase;
    }

    public BigDecimal getTotalValue() {
        return totalValue;
    }

    public void setTotalValue(BigDecimal totalValue) {
        this.totalValue = totalValue;
    }
}
