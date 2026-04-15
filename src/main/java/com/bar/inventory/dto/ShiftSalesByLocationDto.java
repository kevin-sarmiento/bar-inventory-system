package com.bar.inventory.dto;

import java.math.BigDecimal;

public class ShiftSalesByLocationDto {
    private Long locationId;
    private String locationName;
    private Integer shiftsCount;
    private Integer linkedSalesCount;
    private BigDecimal linkedSalesTotal;

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

    public Integer getShiftsCount() {
        return shiftsCount;
    }

    public void setShiftsCount(Integer shiftsCount) {
        this.shiftsCount = shiftsCount;
    }

    public Integer getLinkedSalesCount() {
        return linkedSalesCount;
    }

    public void setLinkedSalesCount(Integer linkedSalesCount) {
        this.linkedSalesCount = linkedSalesCount;
    }

    public BigDecimal getLinkedSalesTotal() {
        return linkedSalesTotal;
    }

    public void setLinkedSalesTotal(BigDecimal linkedSalesTotal) {
        this.linkedSalesTotal = linkedSalesTotal;
    }
}
