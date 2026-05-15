package com.bar.inventory.dto;

import java.time.Instant;

public class AiChatResponseDto {
    private String answer;
    private String model;
    private Instant generatedAt;
    private String contextSummary;
    private boolean webSearchUsed;

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getContextSummary() {
        return contextSummary;
    }

    public void setContextSummary(String contextSummary) {
        this.contextSummary = contextSummary;
    }

    public boolean isWebSearchUsed() {
        return webSearchUsed;
    }

    public void setWebSearchUsed(boolean webSearchUsed) {
        this.webSearchUsed = webSearchUsed;
    }
}
