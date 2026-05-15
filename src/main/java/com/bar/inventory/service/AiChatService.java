package com.bar.inventory.service;

import com.bar.inventory.dto.AiAlertDto;
import com.bar.inventory.dto.AiChatRequestDto;
import com.bar.inventory.dto.AiChatResponseDto;
import com.bar.inventory.dto.AiInsightsMetricsDto;
import com.bar.inventory.dto.AiInsightsResponseDto;
import com.bar.inventory.dto.AiReplenishmentSuggestionDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class AiChatService {
    private final AiInsightsService aiInsightsService;
    private final WebSearchService webSearchService;
    private final WebClient ollamaClient;
    private final String model;
    private final Duration timeout;

    public AiChatService(AiInsightsService aiInsightsService,
                         WebSearchService webSearchService,
                         @Value("${ai.ollama.base-url}") String ollamaBaseUrl,
                         @Value("${ai.ollama.model}") String model,
                         @Value("${ai.ollama.timeout-seconds}") long timeoutSeconds) {
        this.aiInsightsService = aiInsightsService;
        this.webSearchService = webSearchService;
        this.ollamaClient = WebClient.builder()
                .baseUrl(ollamaBaseUrl)
                .build();
        this.model = model;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
    }

    public Mono<AiChatResponseDto> chat(AiChatRequestDto request) {
        boolean askedWeb = Boolean.TRUE.equals(request.getUseWebSearch());
        return aiInsightsService.getInsights(request.getFrom(), request.getTo(), request.getLocationId())
                .flatMap(insights -> webSearchService.fetchSnippets(request.getMessage(), request.getUseWebSearch())
                        .flatMap(webBlock -> askOllama(request.getMessage(), insights, webBlock, askedWeb)
                                .map(ollamaResponse -> toResponse(ollamaResponse, insights, askedWeb && !webBlock.isBlank()))))
                .onErrorMap(WebClientResponseException.class, ex -> {
                    String hint = ollamaErrorHint(ex);
                    return new ResponseStatusException(
                            HttpStatus.SERVICE_UNAVAILABLE,
                            "Ollama respondio con error (" + ex.getStatusCode().value() + "). "
                                    + hint
                                    + " Modelo configurado: '" + model + "'.",
                            ex
                    );
                })
                .onErrorMap(ex -> !(ex instanceof ResponseStatusException), ex -> new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "No se pudo conectar con Ollama. Verifica que el servicio local este activo.",
                        ex
                ));
    }

    private Mono<OllamaGenerateResponse> askOllama(String userMessage,
                                                   AiInsightsResponseDto insights,
                                                   String webSnippets,
                                                   boolean askedWeb) {
        OllamaGenerateRequest body = new OllamaGenerateRequest(
                model,
                buildPrompt(userMessage, insights, webSnippets, askedWeb),
                false,
                new OllamaOptions(0.2, 700)
        );

        return ollamaClient.post()
                .uri("/api/generate")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(OllamaGenerateResponse.class)
                .timeout(timeout);
    }

    private AiChatResponseDto toResponse(OllamaGenerateResponse ollamaResponse,
                                         AiInsightsResponseDto insights,
                                         boolean webSearchUsed) {
        AiChatResponseDto response = new AiChatResponseDto();
        response.setAnswer(ollamaResponse.response() == null || ollamaResponse.response().isBlank()
                ? "No pude generar una respuesta con el modelo local."
                : ollamaResponse.response().trim());
        response.setModel(model);
        response.setGeneratedAt(Instant.now());
        response.setContextSummary(insights.getExecutiveSummary());
        response.setWebSearchUsed(webSearchUsed);
        return response;
    }

    private String buildPrompt(String userMessage,
                               AiInsightsResponseDto insights,
                               String webSnippets,
                               boolean askedWeb) {
        String webSection;
        if (webSnippets != null && !webSnippets.isBlank()) {
            webSection = "\nContexto web (extractos):\n" + webSnippets + "\n";
        } else if (askedWeb) {
            webSection = "\nEl usuario activo busqueda web (SearxNG), pero no llegaron extractos en esta peticion. "
                    + "No digas que tu capacidad impide buscar en internet: indica que la busqueda no devolvio datos "
                    + "ahora y responde con el contexto operativo del sistema.\n";
        } else {
            webSection = "";
        }
        return """
                Eres el Asistente Inteligente del Bar SAKE.
                Responde siempre en español, de forma clara y accionable.
                Prioriza el contexto operativo del sistema. Si hay contexto web, usalo solo como apoyo y cita la URL cuando cites un dato externo.
                No inventes cifras ni hechos que no aparezcan en los contextos. No digas que modificaste el sistema.
                
                Contexto del sistema:
                %s
                %s
                Pregunta del usuario:
                %s
                """.formatted(buildContext(insights), webSection, userMessage);
    }

    private String buildContext(AiInsightsResponseDto insights) {
        StringBuilder context = new StringBuilder();
        context.append("Periodo: ")
                .append(insights.getFromDate())
                .append(" a ")
                .append(insights.getToDate())
                .append(". Ubicacion: ")
                .append(insights.getLocationName() == null ? "Todas las sedes" : insights.getLocationName())
                .append(".\n");
        context.append("Resumen ejecutivo: ").append(insights.getExecutiveSummary()).append("\n");

        AiInsightsMetricsDto metrics = insights.getMetrics();
        if (metrics != null) {
            context.append("Metricas: ")
                    .append(metrics.getTotalAlerts()).append(" alertas, ")
                    .append(metrics.getCriticalAlerts()).append(" criticas, ")
                    .append(metrics.getHighAlerts()).append(" altas, ")
                    .append(metrics.getReplenishmentSuggestions()).append(" sugerencias de reposicion, costo estimado ")
                    .append(metrics.getEstimatedReplenishmentCost())
                    .append(".\n");
        }

        appendAlerts(context, insights.getAlerts());
        appendReplenishment(context, insights.getReplenishmentSuggestions());
        return context.toString();
    }

    private String ollamaErrorHint(WebClientResponseException ex) {
        String body = ex.getResponseBodyAsString();
        if (body != null && body.length() > 400) {
            body = body.substring(0, 400) + "...";
        }
        if (body != null && !body.isBlank()) {
            return "Detalle: " + body.replace('\n', ' ').trim() + " ";
        }
        if (ex.getStatusCode().value() == 404) {
            return "Modelo no encontrado en Ollama. En la carpeta del proyecto ejecuta: docker compose exec ollama ollama pull "
                    + model + " ";
        }
        return "Si el contenedor acaba de iniciar, espera a que termine 'ollama pull'. ";
    }

    private void appendAlerts(StringBuilder context, List<AiAlertDto> alerts) {
        context.append("Alertas principales:\n");
        if (alerts == null || alerts.isEmpty()) {
            context.append("- No hay alertas relevantes.\n");
            return;
        }
        alerts.stream().limit(6).forEach(alert -> context
                .append("- [").append(alert.getSeverity()).append("] ")
                .append(alert.getTitle()).append(": ")
                .append(alert.getMessage()).append(" Accion: ")
                .append(alert.getRecommendedAction()).append("\n"));
    }

    private void appendReplenishment(StringBuilder context, List<AiReplenishmentSuggestionDto> suggestions) {
        context.append("Reposicion sugerida:\n");
        if (suggestions == null || suggestions.isEmpty()) {
            context.append("- No hay compras urgentes sugeridas.\n");
            return;
        }
        suggestions.stream().limit(6).forEach(item -> context
                .append("- ")
                .append(item.getProductName())
                .append(" en ")
                .append(item.getLocationName())
                .append(": comprar ")
                .append(item.getRecommendedQty())
                .append(" ")
                .append(item.getBaseUnit())
                .append(". Motivo: ")
                .append(item.getReason())
                .append("\n"));
    }

    private record OllamaGenerateRequest(String model, String prompt, boolean stream, OllamaOptions options) {
    }

    private record OllamaOptions(double temperature, int num_predict) {
    }

    private record OllamaGenerateResponse(String response, boolean done) {
    }
}
