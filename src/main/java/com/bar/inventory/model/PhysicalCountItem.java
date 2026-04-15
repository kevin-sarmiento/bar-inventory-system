package com.bar.inventory.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;

@Table("physical_count_items")
public class PhysicalCountItem {
    @Id
    @Column("physical_count_item_id")
    private Long id;

    @Column("physical_count_id")
    private Long physicalCountId;

    @Column("product_id")
    private Long productId;

    @Column("theoretical_qty_base")
    private BigDecimal theoreticalQtyBase;

    @Column("actual_qty_base")
    private BigDecimal actualQtyBase;

    @Column("difference_qty_base")
    private BigDecimal differenceQtyBase;

    private String notes;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPhysicalCountId() {
        return physicalCountId;
    }

    public void setPhysicalCountId(Long physicalCountId) {
        this.physicalCountId = physicalCountId;
    }

    public Long getProductId() {
        return productId;
    }

    public void setProductId(Long productId) {
        this.productId = productId;
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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
