package com.bar.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class CreateSaleRequest {
    @NotBlank(message = "saleNumber es obligatorio")
    private String saleNumber;

    @NotNull(message = "saleDatetime es obligatoria")
    private Instant saleDatetime;

    @NotNull(message = "locationId es obligatorio")
    private Long locationId;
    private Long cashierUserId;
    private Long shiftId;

    @NotNull(message = "totalAmount es obligatorio")
    @DecimalMin(value = "0", message = "totalAmount no puede ser negativo")
    private BigDecimal totalAmount;
    private String status;
    private boolean processInventory;
    @NotEmpty(message = "items no puede estar vacio")
    @Valid
    private List<CreateSaleItemRequest> items = new ArrayList<>();

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

    public boolean isProcessInventory() {
        return processInventory;
    }

    public void setProcessInventory(boolean processInventory) {
        this.processInventory = processInventory;
    }

    public List<CreateSaleItemRequest> getItems() {
        return items;
    }

    public void setItems(List<CreateSaleItemRequest> items) {
        this.items = items;
    }
}
