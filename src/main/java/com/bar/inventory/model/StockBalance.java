package com.bar.inventory.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Table("stock_balances")
public class StockBalance {
    @Id
    @Column("stock_balance_id")
    private Long id;

    @Column("product_id")
    private Long productId;

    @Column("location_id")
    private Long locationId;

    @Column("lot_number")
    private String lotNumber;

    @Column("expiration_date")
    private LocalDate expirationDate;

    @Column("quantity_base")
    private BigDecimal quantityBase;

    @Column("avg_unit_cost_base")
    private BigDecimal avgUnitCostBase;

    @Column("last_movement_at")
    private Instant lastMovementAt;

    @Column("created_at")
    private Instant createdAt;

    @Column("updated_at")
    private Instant updatedAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
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

    public BigDecimal getAvgUnitCostBase() {
        return avgUnitCostBase;
    }

    public void setAvgUnitCostBase(BigDecimal avgUnitCostBase) {
        this.avgUnitCostBase = avgUnitCostBase;
    }

    public Instant getLastMovementAt() {
        return lastMovementAt;
    }

    public void setLastMovementAt(Instant lastMovementAt) {
        this.lastMovementAt = lastMovementAt;
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
}
