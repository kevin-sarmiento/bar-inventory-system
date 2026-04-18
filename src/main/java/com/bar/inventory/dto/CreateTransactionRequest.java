package com.bar.inventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class CreateTransactionRequest {
    @NotBlank(message = "transactionNumber es obligatorio")
    private String transactionNumber;

    @NotBlank(message = "transactionType es obligatorio")
    private String transactionType;

    /** Ignorada en servidor: la fecha se asigna al crear (Instant.now()). */
    private Instant transactionDate;
    private Long sourceLocationId;
    private Long targetLocationId;
    private Long supplierId;
    private String referenceText;
    private String reason;
    private String status;
    private Long createdBy;
    @NotEmpty(message = "items no puede estar vacio")
    @Valid
    private List<CreateTransactionItemRequest> items = new ArrayList<>();

    public String getTransactionNumber() {
        return transactionNumber;
    }

    public void setTransactionNumber(String transactionNumber) {
        this.transactionNumber = transactionNumber;
    }

    public String getTransactionType() {
        return transactionType;
    }

    public void setTransactionType(String transactionType) {
        this.transactionType = transactionType;
    }

    public Instant getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(Instant transactionDate) {
        this.transactionDate = transactionDate;
    }

    public Long getSourceLocationId() {
        return sourceLocationId;
    }

    public void setSourceLocationId(Long sourceLocationId) {
        this.sourceLocationId = sourceLocationId;
    }

    public Long getTargetLocationId() {
        return targetLocationId;
    }

    public void setTargetLocationId(Long targetLocationId) {
        this.targetLocationId = targetLocationId;
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
    }

    public String getReferenceText() {
        return referenceText;
    }

    public void setReferenceText(String referenceText) {
        this.referenceText = referenceText;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(Long createdBy) {
        this.createdBy = createdBy;
    }

    public List<CreateTransactionItemRequest> getItems() {
        return items;
    }

    public void setItems(List<CreateTransactionItemRequest> items) {
        this.items = items;
    }
}
