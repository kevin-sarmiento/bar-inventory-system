package com.bar.inventory.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public class AiChatRequestDto {
    @NotBlank
    private String message;
    private LocalDate from;
    private LocalDate to;
    private Long locationId;
    /**
     * When true and {@code ai.web-search} is configured, the backend queries SearxNG and adds snippets to the prompt.
     */
    private Boolean useWebSearch;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LocalDate getFrom() {
        return from;
    }

    public void setFrom(LocalDate from) {
        this.from = from;
    }

    public LocalDate getTo() {
        return to;
    }

    public void setTo(LocalDate to) {
        this.to = to;
    }

    public Long getLocationId() {
        return locationId;
    }

    public void setLocationId(Long locationId) {
        this.locationId = locationId;
    }

    public Boolean getUseWebSearch() {
        return useWebSearch;
    }

    public void setUseWebSearch(Boolean useWebSearch) {
        this.useWebSearch = useWebSearch;
    }
}
