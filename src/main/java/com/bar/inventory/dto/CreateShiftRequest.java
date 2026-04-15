package com.bar.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public class CreateShiftRequest {
    @NotNull(message = "userId es obligatorio")
    private Long userId;

    @NotNull(message = "locationId es obligatorio")
    private Long locationId;

    @NotBlank(message = "roleName es obligatorio")
    private String roleName;

    @NotNull(message = "scheduledStart es obligatorio")
    private Instant scheduledStart;

    @NotNull(message = "scheduledEnd es obligatorio")
    private Instant scheduledEnd;

    private String notes;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public String getRoleName() {
        return roleName;
    }

    public void setRoleName(String roleName) {
        this.roleName = roleName;
    }

    public Instant getScheduledStart() {
        return scheduledStart;
    }

    public void setScheduledStart(Instant scheduledStart) {
        this.scheduledStart = scheduledStart;
    }

    public Instant getScheduledEnd() {
        return scheduledEnd;
    }

    public void setScheduledEnd(Instant scheduledEnd) {
        this.scheduledEnd = scheduledEnd;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
