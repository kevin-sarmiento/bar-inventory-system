package com.bar.inventory.controller;

import com.bar.inventory.dto.AiChatRequestDto;
import com.bar.inventory.dto.AiChatResponseDto;
import com.bar.inventory.dto.AiInsightsResponseDto;
import com.bar.inventory.service.AiChatService;
import com.bar.inventory.service.AiInsightsScopeService;
import com.bar.inventory.service.AiInsightsService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.time.LocalDate;

@RestController
@RequestMapping(path = "/api/ai", produces = MediaType.APPLICATION_JSON_VALUE)
public class AiInsightsController {
    private final AiInsightsService aiInsightsService;
    private final AiInsightsScopeService aiInsightsScopeService;
    private final AiChatService aiChatService;

    public AiInsightsController(AiInsightsService aiInsightsService,
                                AiInsightsScopeService aiInsightsScopeService,
                                AiChatService aiChatService) {
        this.aiInsightsService = aiInsightsService;
        this.aiInsightsScopeService = aiInsightsScopeService;
        this.aiChatService = aiChatService;
    }

    @GetMapping("/insights")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO','BARTENDER')")
    public Mono<AiInsightsResponseDto> insights(
            @RequestParam(value = "from", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(value = "to", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(value = "locationId", required = false) Long locationId) {
        return aiInsightsScopeService.applyScope(aiInsightsService.getInsights(from, to, locationId));
    }

    @PostMapping(path = "/chat", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE','INVENTARIO','BARTENDER')")
    public Mono<AiChatResponseDto> chat(@Valid @RequestBody AiChatRequestDto request) {
        return aiChatService.chat(request);
    }
}
