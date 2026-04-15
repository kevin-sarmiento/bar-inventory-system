package com.bar.inventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public class CreateSaleItemRequest {
    private Long menuItemId;
    private Long productId;
    private Long unitId;

    @NotNull(message = "quantity es obligatoria")
    @DecimalMin(value = "0.0001", message = "quantity debe ser mayor a 0")
    private BigDecimal quantity;

    @NotNull(message = "unitPrice es obligatorio")
    @DecimalMin(value = "0", message = "unitPrice no puede ser negativo")
    private BigDecimal unitPrice;

    public Long getMenuItemId() {
        return menuItemId;
    }

    public void setMenuItemId(Long menuItemId) {
        this.menuItemId = menuItemId;
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

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }
}
