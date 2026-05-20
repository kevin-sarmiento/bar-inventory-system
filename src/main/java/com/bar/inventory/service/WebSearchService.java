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
import java.util.regex.Pattern;

@Service
public class WebSearchService {
    private static final Logger log = LoggerFactory.getLogger(WebSearchService.class);
    private static final String INTERNAL_CLIENT_IP = "10.0.0.1";
    private static final Pattern FILLER_PREFIX = Pattern.compile(
            "(?i)^(?:por favor[,\\s]*)?(?:podr[ií]as|puedes|busca(?:r)?(?: en (?:la )?web| en internet)?)[,\\s]*"
    );

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
        this.timeout = Duration.ofSeconds(Math.max(5, timeoutSeconds));
    }

    /**
     * Returns a plain-text block for the LLM, or empty when disabled, not requested, or on failure.
     */
    public Mono<String> fetchSnippets(String query, Boolean useWebSearch) {
        if (!Boolean.TRUE.equals(useWebSearch) || !enabled || client == null) {
            return Mono.just("");
        }
        String searchQuery = toSearchQuery(query);
        if (searchQuery.isEmpty()) {
            return Mono.just("");
        }
        return searchOnce(searchQuery)
                .flatMap(block -> {
                    if (!block.isBlank()) {
                        return Mono.just(block);
                    }
                    String fallback = shortenQuery(searchQuery);
                    if (fallback.equals(searchQuery)) {
                        return Mono.just("");
                    }
                    log.info("SearxNG sin resultados; reintento con consulta acortada");
                    return searchOnce(fallback);
                });
    }

    private Mono<String> searchOnce(String searchQuery) {
        return client.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("q", searchQuery)
                        .queryParam("format", "json")
                        .queryParam("language", "es")
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
                        log.warn("SearxNG no devolvio resultados para: {}", abbreviate(searchQuery));
                    } else {
                        log.debug("SearxNG devolvio contexto web ({} caracteres) para: {}",
                                block.length(), abbreviate(searchQuery));
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

    static String toSearchQuery(String message) {
        if (message == null) {
            return "";
        }
        String q = FILLER_PREFIX.matcher(message.strip()).replaceFirst("").strip();
        if (q.length() > 180) {
            int question = q.indexOf('?');
            if (question >= 20 && question < 180) {
                q = q.substring(0, question + 1);
            } else {
                q = q.substring(0, 180).replaceAll("\\s+\\S*$", "").strip();
            }
        }
        return q;
    }

    private static String shortenQuery(String query) {
        String[] words = query.split("\\s+");
        if (words.length <= 6) {
            return query;
        }
        return String.join(" ", java.util.Arrays.copyOf(words, 6));
    }

    private String formatResults(JsonNode root) {
        JsonNode results = root.get("results");
        if (results == null || !results.isArray() || results.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        sb.append("Resultados de busqueda web (SearxNG). Usa SOLO estos extractos para datos externos; cita la URL:\n\n");
        int n = 0;
        for (JsonNode r : results) {
            if (n >= maxResults) {
                break;
            }
            String title = text(r, "title");
            String url = text(r, "url");
            String content = text(r, "content");
            if (title.isBlank() && content.isBlank()) {
                continue;
            }
            if (content.length() > 450) {
                content = content.substring(0, 450) + "...";
            }
            sb.append(n + 1).append(". ").append(title).append("\n   ").append(url).append("\n   ").append(content).append("\n\n");
            n++;
        }
        return n == 0 ? "" : sb.toString();
    }

    private static String text(JsonNode node, String field) {
        JsonNode v = node.get(field);
        if (v == null || v.isNull()) {
            return "";
        }
        return v.asText("").strip();
    }

    private static String abbreviate(String value) {
        if (value.length() <= 80) {
            return value;
        }
        return value.substring(0, 77) + "...";
    }
}
