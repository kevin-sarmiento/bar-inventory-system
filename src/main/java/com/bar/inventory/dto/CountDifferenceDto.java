package com.bar.inventory.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class CountDifferenceDto {
    private Long physicalCountId;
    private String countNumber;
    private Instant countDate;
    private String locationName;
    private Long productId;
    private String productName;
    private BigDecimal theoreticalQtyBase;
    private BigDecimal actualQtyBase;
    private BigDecimal differenceQtyBase;
    private String baseUnit;
    private String createdBy;
    private String approvedBy;

    public Long getPhysicalCountId() {
        return physicalCountId;
    }

    public void setPhysicalCountId(Long physicalCountId) {
        this.physicalCountId = physicalCountId;
    }

    public String getCountNumber() {
        return countNumber;
    }

    public void setCountNumber(String countNumber) {
        this.countNumber = countNumber;
    }

    public Instant getCountDate() {
        return countDate;
    }

    public void setCountDate(Instant countDate) {
        this.countDate = countDate;
    }

    public String getLocationName() {
        return locationName;
    }

    public void setLocationName(String locationName) {
        this.locationName = locationName;
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

    public BigDecimal getTheoreticalQtyBase() {
        return theoreticalQtyBase;
    }

    public void setTheoreticalQtyBase(BigDecimal theoreticalQtyBase) {
        this.theoreticalQtyBase = theoreticalQtyBase;
    }

    public BigDecimal getActualQtyBase() {
        return actualQtyBase;
    }

    public void setActualQtyBase(BigDecimal actualQtyBase) {
        this.actualQtyBase = actualQtyBase;
    }

    public BigDecimal getDifferenceQtyBase() {
        return differenceQtyBase;
    }

    public void setDifferenceQtyBase(BigDecimal differenceQtyBase) {
        this.differenceQtyBase = differenceQtyBase;
    }

    public String getBaseUnit() {
        return baseUnit;
    }

    public void setBaseUnit(String baseUnit) {
        this.baseUnit = baseUnit;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public String getApprovedBy() {
        return approvedBy;
    }

    public void setApprovedBy(String approvedBy) {
        this.approvedBy = approvedBy;
    }
}
