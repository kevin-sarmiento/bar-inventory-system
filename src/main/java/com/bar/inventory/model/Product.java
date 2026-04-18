package com.bar.inventory.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;
import java.time.Instant;

@Table("products")
public class Product {
    @Id
    @Column("product_id")
    private Long id;

    private String sku;

    @Column("product_name")
    @NotBlank(message = "name es obligatorio")
    private String name;

    @Column("category_id")
    @NotNull(message = "categoryId es obligatorio")
    private Long categoryId;

    @Column("base_unit_id")
    @NotNull(message = "baseUnitId es obligatorio")
    private Long baseUnitId;

    @Column("default_location_id")
    private Long defaultLocationId;

    @Column("min_stock_base_qty")
    @NotNull(message = "minStockBaseQty es obligatorio")
    @DecimalMin(value = "0", message = "minStockBaseQty no puede ser negativo")
    private BigDecimal minStockBaseQty;

    private String barcode;

    @Column("is_active")
    private Boolean active;

    private String notes;

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

    public String getSku() {
        return sku;
    }

    public void setSku(String sku) {
        this.sku = sku;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public Long getBaseUnitId() {
        return baseUnitId;
    }

    public void setBaseUnitId(Long baseUnitId) {
        this.baseUnitId = baseUnitId;
    }

    public Long getDefaultLocationId() {
        return defaultLocationId;
    }

    public void setDefaultLocationId(Long defaultLocationId) {
        this.defaultLocationId = defaultLocationId;
    }

    public BigDecimal getMinStockBaseQty() {
        return minStockBaseQty;
    }

    public void setMinStockBaseQty(BigDecimal minStockBaseQty) {
        this.minStockBaseQty = minStockBaseQty;
    }

    public String getBarcode() {
        return barcode;
    }

    public void setBarcode(String barcode) {
        this.barcode = barcode;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
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
