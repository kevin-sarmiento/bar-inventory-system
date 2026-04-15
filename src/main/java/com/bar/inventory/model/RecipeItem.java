package com.bar.inventory.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.math.BigDecimal;

@Table("recipe_items")
public class RecipeItem {
    @Id
    @Column("recipe_item_id")
    private Long id;

    @Column("recipe_id")
    @NotNull(message = "recipeId es obligatorio")
    private Long recipeId;

    @Column("product_id")
    @NotNull(message = "productId es obligatorio")
    private Long productId;

    @Column("unit_id")
    @NotNull(message = "unitId es obligatorio")
    private Long unitId;

    @NotNull(message = "quantity es obligatorio")
    @DecimalMin(value = "0.0001", message = "quantity debe ser mayor a 0")
    private BigDecimal quantity;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getRecipeId() {
        return recipeId;
    }

    public void setRecipeId(Long recipeId) {
        this.recipeId = recipeId;
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
}
