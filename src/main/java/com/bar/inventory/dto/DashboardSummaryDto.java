package com.bar.inventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class DashboardSummaryDto {
    private LocalDate reportDate;
    private Long locationId;
    private String locationName;
    private Integer salesCount;
    private BigDecimal salesTotal;
    private BigDecimal averageTicket;
    private Integer activeShifts;
    private Integer scheduledShifts;
    private Integer completedShifts;
    private Integer lowStockItems;
    private BigDecimal inventoryValue;
    private Integer wasteMovementsCount;
    private BigDecimal wasteQuantity;
    private Integer consumptionMovementsCount;
    private BigDecimal consumptionQuantity;
    private List<DashboardTopProductDto> topProducts;
    private List<DashboardTopUserDto> topUsers;
    private List<DashboardHourlySalesDto> hourlySales;

    public LocalDate getReportDate() {
        return reportDate;
    }

    public void setReportDate(LocalDate reportDate) {
        this.reportDate = reportDate;
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

    public Integer getSalesCount() {
        return salesCount;
    }

    public void setSalesCount(Integer salesCount) {
        this.salesCount = salesCount;
    }

    public BigDecimal getSalesTotal() {
        return salesTotal;
    }

    public void setSalesTotal(BigDecimal salesTotal) {
        this.salesTotal = salesTotal;
    }

    public BigDecimal getAverageTicket() {
        return averageTicket;
    }

    public void setAverageTicket(BigDecimal averageTicket) {
        this.averageTicket = averageTicket;
    }

    public Integer getActiveShifts() {
        return activeShifts;
    }

    public void setActiveShifts(Integer activeShifts) {
        this.activeShifts = activeShifts;
    }

    public Integer getScheduledShifts() {
        return scheduledShifts;
    }

    public void setScheduledShifts(Integer scheduledShifts) {
        this.scheduledShifts = scheduledShifts;
    }

    public Integer getCompletedShifts() {
        return completedShifts;
    }

    public void setCompletedShifts(Integer completedShifts) {
        this.completedShifts = completedShifts;
    }

    public Integer getLowStockItems() {
        return lowStockItems;
    }

    public void setLowStockItems(Integer lowStockItems) {
        this.lowStockItems = lowStockItems;
    }

    public BigDecimal getInventoryValue() {
        return inventoryValue;
    }

    public void setInventoryValue(BigDecimal inventoryValue) {
        this.inventoryValue = inventoryValue;
    }

    public Integer getWasteMovementsCount() {
        return wasteMovementsCount;
    }

    public void setWasteMovementsCount(Integer wasteMovementsCount) {
        this.wasteMovementsCount = wasteMovementsCount;
    }

    public BigDecimal getWasteQuantity() {
        return wasteQuantity;
    }

    public void setWasteQuantity(BigDecimal wasteQuantity) {
        this.wasteQuantity = wasteQuantity;
    }

    public Integer getConsumptionMovementsCount() {
        return consumptionMovementsCount;
    }

    public void setConsumptionMovementsCount(Integer consumptionMovementsCount) {
        this.consumptionMovementsCount = consumptionMovementsCount;
    }

    public BigDecimal getConsumptionQuantity() {
        return consumptionQuantity;
    }

    public void setConsumptionQuantity(BigDecimal consumptionQuantity) {
        this.consumptionQuantity = consumptionQuantity;
    }

    public List<DashboardTopProductDto> getTopProducts() {
        return topProducts;
    }

    public void setTopProducts(List<DashboardTopProductDto> topProducts) {
        this.topProducts = topProducts;
    }

    public List<DashboardTopUserDto> getTopUsers() {
        return topUsers;
    }

    public void setTopUsers(List<DashboardTopUserDto> topUsers) {
        this.topUsers = topUsers;
    }

    public List<DashboardHourlySalesDto> getHourlySales() {
        return hourlySales;
    }

    public void setHourlySales(List<DashboardHourlySalesDto> hourlySales) {
        this.hourlySales = hourlySales;
    }
}
