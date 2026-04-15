package com.bar.inventory.dto;

import java.math.BigDecimal;

public class ShiftSalesByUserDto {
    private Long userId;
    private String username;
    private String fullName;
    private Integer shiftsCount;
    private Integer linkedSalesCount;
    private BigDecimal linkedSalesTotal;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
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
