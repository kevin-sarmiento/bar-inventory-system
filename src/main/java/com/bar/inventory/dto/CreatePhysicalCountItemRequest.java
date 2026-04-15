package com.bar.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CreatePhysicalCountItemRequest {
    @NotNull(message = "productId es obligatorio")
    private Long productId;

    @NotNull(message = "theoreticalQtyBase es obligatorio")
    @DecimalMin(value = "0", message = "theoreticalQtyBase no puede ser negativo")
    private BigDecimal theoreticalQtyBase;

    @NotNull(message = "actualQtyBase es obligatorio")
    @DecimalMin(value = "0", message = "actualQtyBase no puede ser negativo")
    private BigDecimal actualQtyBase;
    private String notes;

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

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
