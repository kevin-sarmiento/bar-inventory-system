package com.bar.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class CreatePhysicalCountRequest {
    @NotBlank(message = "countNumber es obligatorio")
    private String countNumber;

    @NotNull(message = "locationId es obligatorio")
    private Long locationId;

    @NotNull(message = "countDate es obligatoria")
    private Instant countDate;
    private String notes;
    private Long createdBy;
    @NotEmpty(message = "items no puede estar vacio")
    @Valid
    private List<CreatePhysicalCountItemRequest> items = new ArrayList<>();

    public String getCountNumber() {
        return countNumber;
    }

    public void setCountNumber(String countNumber) {
        this.countNumber = countNumber;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public Instant getCountDate() {
        return countDate;
    }

    public void setCountDate(Instant countDate) {
        this.countDate = countDate;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public List<CreatePhysicalCountItemRequest> getItems() {
        return items;
    }

    public void setItems(List<CreatePhysicalCountItemRequest> items) {
        this.items = items;
    }
}
