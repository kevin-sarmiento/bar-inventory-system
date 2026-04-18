package com.bar.inventory.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.Transient;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Table("sales")
public class Sale {
    @Id
    @Column("sale_id")
    private Long id;

    @Column("sale_number")
    private String saleNumber;

    @Column("sale_datetime")
    private Instant saleDatetime;

    @Column("location_id")
    private Long locationId;

    @Column("cashier_user_id")
    private Long cashierUserId;

    @Column("created_by")
    private Long createdBy;

    @Column("shift_id")
    private Long shiftId;

    @Column("total_amount")
    private BigDecimal totalAmount;

    private String status;

    @Column("inventory_processed")
    private Boolean inventoryProcessed;

    @Column("created_at")
    private Instant createdAt;

    @Column("updated_at")
    private Instant updatedAt;

    @Transient
    private String cashierUsername;

    @Transient
    private String cashierFullName;

    @Transient
    private String locationName;

    @Transient
    private String createdByUsername;

    @Transient
    private String createdByFullName;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getSaleNumber() {
        return saleNumber;
    }

    public void setSaleNumber(String saleNumber) {
        this.saleNumber = saleNumber;
    }

    public Instant getSaleDatetime() {
        return saleDatetime;
    }

    public void setSaleDatetime(Instant saleDatetime) {
        this.saleDatetime = saleDatetime;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public Long getCashierUserId() {
        return cashierUserId;
    }

    public void setCashierUserId(Long cashierUserId) {
        this.cashierUserId = cashierUserId;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public Long getShiftId() {
        return shiftId;
    }

    public void setShiftId(Long shiftId) {
        this.shiftId = shiftId;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Boolean getInventoryProcessed() {
        return inventoryProcessed;
    }

    public void setInventoryProcessed(Boolean inventoryProcessed) {
        this.inventoryProcessed = inventoryProcessed;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCashierUsername() {
        return cashierUsername;
    }

    public void setCashierUsername(String cashierUsername) {
        this.cashierUsername = cashierUsername;
    }

    public String getCashierFullName() {
        return cashierFullName;
    }

    public void setCashierFullName(String cashierFullName) {
        this.cashierFullName = cashierFullName;
    }

    public String getLocationName() {
        return locationName;
    }

    public void setLocationName(String locationName) {
        this.locationName = locationName;
    }

    public String getCreatedByUsername() {
        return createdByUsername;
    }

    public void setCreatedByUsername(String createdByUsername) {
        this.createdByUsername = createdByUsername;
    }

    public String getCreatedByFullName() {
        return createdByFullName;
    }

    public void setCreatedByFullName(String createdByFullName) {
        this.createdByFullName = createdByFullName;
    }
}
