package com.bar.inventory.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.LocalDate;

@Table("inventory_transaction_items")
public class InventoryTransactionItem {
    @Id
    @Column("transaction_item_id")
    private Long id;

    @Column("transaction_id")
    private Long transactionId;

    @Column("product_id")
    private Long productId;

    @Column("unit_id")
    private Long unitId;

    private BigDecimal quantity;

    @Column("quantity_base")
    private BigDecimal quantityBase;

    @Column("unit_cost")
    private BigDecimal unitCost;

    @Column("unit_cost_base")
    private BigDecimal unitCostBase;

    @Column("lot_number")
    private String lotNumber;

    @Column("expiration_date")
    private LocalDate expirationDate;

    private String notes;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTransactionId() {
        return transactionId;
    }

    public void setTransactionId(Long transactionId) {
        this.transactionId = transactionId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
    }

    public Long getUnitId() {
        return unitId;
    }

    public void setUnitId(Long unitId) {
        this.unitId = unitId;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getQuantityBase() {
        return quantityBase;
    }

    public void setQuantityBase(BigDecimal quantityBase) {
        this.quantityBase = quantityBase;
    }

    public BigDecimal getUnitCost() {
        return unitCost;
    }

    public void setUnitCost(BigDecimal unitCost) {
        this.unitCost = unitCost;
    }

    public BigDecimal getUnitCostBase() {
        return unitCostBase;
    }

    public void setUnitCostBase(BigDecimal unitCostBase) {
        this.unitCostBase = unitCostBase;
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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
