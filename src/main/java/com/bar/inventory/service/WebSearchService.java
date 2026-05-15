package com.bar.inventory.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Service
public class WebSearchService {
    private static final Logger log = LoggerFactory.getLogger(WebSearchService.class);
    private static final String INTERNAL_CLIENT_IP = "10.0.0.1";

    private final WebClient client;
    private final boolean enabled;
    private final int maxResults;
    private final Duration timeout;

    public WebSearchService(
            @Value("${ai.web-search.enabled:false}") boolean enabled,
            @Value("${ai.web-search.base-url:}") String baseUrl,
            @Value("${ai.web-search.max-results:5}") int maxResults,
            @Value("${ai.web-search.timeout-seconds:15}") long timeoutSeconds) {
        this.enabled = enabled;
        this.maxResults = Math.min(Math.max(1, maxResults), 10);
        String url = baseUrl == null ? "" : baseUrl.trim();
        if (url.endsWith("/")) {
            url = url.substring(0, url.length() - 1);
        }
        this.client = url.isEmpty() ? null : WebClient.builder().baseUrl(url).build();
        this.timeout = Duration.ofSeconds(Math.max(3, timeoutSeconds));
    }

    /**
     * Returns a plain-text block for the LLM, or empty when disabled, not requested, or on failure.
     */
    public Mono<String> fetchSnippets(String query, Boolean useWebSearch) {
        if (!Boolean.TRUE.equals(useWebSearch) || !enabled || client == null) {
            return Mono.just("");
        }
        String q = query == null ? "" : query.strip();
        if (q.length() > 240) {
            q = q.substring(0, 240);
        }
        if (q.isEmpty()) {
            return Mono.just("");
        }
        final String searchQuery = q;
        return client.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("q", searchQuery)
                        .queryParam("format", "json")
                        .build())
                .header(HttpHeaders.USER_AGENT, "BarInventorySystem/1.0 (internal)")
                .header("X-Forwarded-For", INTERNAL_CLIENT_IP)
                .header("X-Real-IP", INTERNAL_CLIENT_IP)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .timeout(timeout)
                .map(this::formatResults)
                .doOnNext(block -> {
                    if (block.isBlank()) {
                        log.warn("SearxNG no devolvio resultados para la consulta (query length={})", searchQuery.length());
                    }
                })
                .onErrorResume(WebClientResponseException.class, ex -> {
                    log.warn("SearxNG HTTP {}: {}", ex.getStatusCode().value(), ex.getResponseBodyAsString());
                    return Mono.just("");
                })
                .onErrorResume(ex -> {
                    log.warn("SearxNG no disponible: {}", ex.getMessage());
                    return Mono.just("");
                });
    }

    private String formatResults(JsonNode root) {
        JsonNode results = root.get("results");
        if (results == null || !results.isArray() || results.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Resultados de busqueda web (SearxNG). Cita fuentes; no inventes datos fuera de estos extractos:\n\n");
        int n = 0;
        for (JsonNode r : results) {
            if (n >= maxResults) {
                break;
            }
            String title = text(r, "title");
            String url = text(r, "url");
            String content = text(r, "content");
            if (content.length() > 450) {
                content = content.substring(0, 450) + "...";
            }
            sb.append(n + 1).append(". ").append(title).append("\n   ").append(url).append("\n   ").append(content).append("\n\n");
            n++;
        }
        return sb.toString();
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) {
            return "";
        }
        return v.asText("").strip();
    }
}
