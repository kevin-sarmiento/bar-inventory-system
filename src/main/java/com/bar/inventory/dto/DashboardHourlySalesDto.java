package com.bar.inventory.dto;

import java.math.BigDecimal;

public class DashboardHourlySalesDto {
    private Integer hourOfDay;
    private Integer salesCount;
    private BigDecimal totalSold;

    public Integer getHourOfDay() {
        return hourOfDay;
    }

    public void setHourOfDay(Integer hourOfDay) {
        this.hourOfDay = hourOfDay;
    }

    public Integer getSalesCount() {
        return salesCount;
    }

    public void setSalesCount(Integer salesCount) {
        this.salesCount = salesCount;
    }

    public BigDecimal getTotalSold() {
        return totalSold;
    }

    public void setTotalSold(BigDecimal totalSold) {
        this.totalSold = totalSold;
    }
}
