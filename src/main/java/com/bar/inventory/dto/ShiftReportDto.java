package com.bar.inventory.dto;

import java.math.BigDecimal;
import java.time.Instant;

public class ShiftReportDto {
    private Long shiftId;
    private Long userId;
    private String username;
    private String fullName;
    private Long locationId;
    private String locationName;
    private String roleName;
    private Instant scheduledStart;
    private Instant scheduledEnd;
    private Instant actualStart;
    private Instant actualEnd;
    private String status;
    private Integer linkedSalesCount;
    private BigDecimal linkedSalesTotal;

    public Long getShiftId() {
        return shiftId;
    }

    public void setShiftId(Long shiftId) {
        this.shiftId = shiftId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public String getLocationName() {
        return locationName;
    }

    public void setLocationName(String locationName) {
        this.locationName = locationName;
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

    public Instant getActualStart() {
        return actualStart;
    }

    public void setActualStart(Instant actualStart) {
        this.actualStart = actualStart;
    }

    public Instant getActualEnd() {
        return actualEnd;
    }

    public void setActualEnd(Instant actualEnd) {
        this.actualEnd = actualEnd;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getLinkedSalesCount() {
        return linkedSalesCount;
    }

    public void setLinkedSalesCount(Integer linkedSalesCount) {
        this.linkedSalesCount = linkedSalesCount;
    }

    public BigDecimal getLinkedSalesTotal() {
        return linkedSalesTotal;
    }

    public void setLinkedSalesTotal(BigDecimal linkedSalesTotal) {
        this.linkedSalesTotal = linkedSalesTotal;
    }
}
