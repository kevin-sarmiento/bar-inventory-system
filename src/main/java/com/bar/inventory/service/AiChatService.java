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
import java.util.concurrent.TimeoutException;

@Service
public class AiChatService {
    private final AiInsightsService aiInsightsService;
    private final AiInsightsScopeService aiInsightsScopeService;
    private final AiSystemKnowledgeService aiSystemKnowledgeService;
    private final WebSearchService webSearchService;
    private final WebClient ollamaClient;
    private final String model;
    private final Duration timeout;

    public AiChatService(AiInsightsService aiInsightsService,
                         AiInsightsScopeService aiInsightsScopeService,
                         AiSystemKnowledgeService aiSystemKnowledgeService,
                         WebSearchService webSearchService,
                         @Value("${ai.ollama.base-url}") String ollamaBaseUrl,
                         @Value("${ai.ollama.model}") String model,
                         @Value("${ai.ollama.timeout-seconds}") long timeoutSeconds) {
        this.aiInsightsService = aiInsightsService;
        this.aiInsightsScopeService = aiInsightsScopeService;
        this.aiSystemKnowledgeService = aiSystemKnowledgeService;
        this.webSearchService = webSearchService;
        this.ollamaClient = WebClient.builder()
                .baseUrl(ollamaBaseUrl)
                .build();
        this.model = model;
        this.timeout = Duration.ofSeconds(timeoutSeconds);
    }

    public Mono<AiChatResponseDto> chat(AiChatRequestDto request) {
        return aiInsightsScopeService.currentRoles()
                .flatMap(roles -> {
                    boolean askedWeb = Boolean.TRUE.equals(request.getUseWebSearch())
                            && aiInsightsScopeService.allowsWebSearch(roles);
                    boolean bartenderScope = aiInsightsScopeService.isBartenderOperationalOnly(roles);
                    return aiInsightsService.getInsights(request.getFrom(), request.getTo(), request.getLocationId())
                            .flatMap(insights -> aiInsightsScopeService.applyScope(insights, roles))
                            .flatMap(insights -> webSearchService.fetchSnippets(
                                            request.getMessage(),
                                            askedWeb ? Boolean.TRUE : Boolean.FALSE)
                                    .flatMap(webBlock -> askOllama(
                                                    request.getMessage(),
                                                    insights,
                                                    webBlock,
                                                    askedWeb,
                                                    bartenderScope)
                                            .map(ollamaResponse -> toResponse(
                                                    ollamaResponse,
                                                    insights,
                                                    askedWeb && !webBlock.isBlank()))));
                })
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
                        ollamaUnavailableMessage(ex),
                        ex
                ));
    }

    private Mono<OllamaGenerateResponse> askOllama(String userMessage,
                                                   AiInsightsResponseDto insights,
                                                   String webSnippets,
                                                   boolean askedWeb,
                                                   boolean bartenderScope) {
        OllamaGenerateRequest body = new OllamaGenerateRequest(
                model,
                buildPrompt(userMessage, insights, webSnippets, askedWeb, bartenderScope),
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
                               boolean askedWeb,
                               boolean bartenderScope) {
        String webSection;
        if (webSnippets != null && !webSnippets.isBlank()) {
            webSection = """
                    
                    === Busqueda web (SearxNG) ===
                    El backend ya consulto Internet y trajo estos extractos. DEBES usarlos para responder la parte externa.
                    PROHIBIDO decir que no puedes buscar en Internet, que no tienes acceso en tiempo real o que solo usas tu entrenamiento.
                    Cita la URL cuando uses un dato de esta seccion.
                    
                    """ + webSnippets + "\n";
        } else if (askedWeb) {
            webSection = """
                    
                    === Busqueda web solicitada ===
                    El usuario activo busqueda web, pero SearxNG no devolvio extractos en esta peticion (timeout o sin resultados).
                    PROHIBIDO decir que no puedes buscar en Internet o que no tienes acceso externo.
                    Indica brevemente que la busqueda no devolvio datos utiles ahora y responde con el contexto operativo del inventario.
                    
                    """;
        } else {
            webSection = "";
        }
        String roleInstructions = bartenderScope
                ? """
                Eres el copiloto de barra del Bar SAKE para un bartender.
                Datos en vivo: solo stock bajo y vencimientos en areas de servicio (barra, cocina, nevera).
                SI el usuario pregunta COMO hacer algo en el sistema (ej. registrar compra, venta, turno), EXPLICA los pasos
                segun la documentacion interna, aunque el bartender no tenga permiso para ejecutarlo. Aclara quien debe hacerlo
                (inventario, gerencia) y que tu rol no puede registrarlo ni ver costos.
                NO inventes cifras. NO muestres costos, reposicion sugerida, mermas de gestion, conteos ni datos de bodega del contexto en vivo.
                Nunca digas solo "no puedo" sin dar orientacion util cuando la guia tenga el procedimiento.
                """
                : """
                Eres el Asistente Inteligente del Bar SAKE.
                Responde siempre en español, de forma clara y accionable.
                Prioriza el contexto operativo del sistema. Si hay extractos web, son tu fuente para datos externos.
                No inventes cifras ni hechos que no aparezcan en los contextos. No digas que modificaste el sistema.
                """;
        String systemKnowledge = aiSystemKnowledgeService.getKnowledge(bartenderScope);
        String knowledgeSection = systemKnowledge.isBlank()
                ? ""
                : """
                
                === Conocimiento del sistema Bar SAKE (documentacion interna) ===
                Usa esta guia para explicar COMO usar el software, que hace cada modulo, roles y flujos.
                Para cifras actuales de inventario usa solo el bloque "Contexto operativo en vivo" mas abajo.
                
                """ + systemKnowledge + "\n";

        return """
                %s
                %s
                === Contexto operativo en vivo (datos del periodo seleccionado) ===
                %s
                %s
                Pregunta del usuario:
                %s
                """.formatted(
                roleInstructions.strip(),
                knowledgeSection,
                buildContext(insights, bartenderScope),
                webSection,
                userMessage);
    }

    private String buildContext(AiInsightsResponseDto insights, boolean bartenderScope) {
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
                    .append(metrics.getHighAlerts()).append(" altas");
            if (!bartenderScope) {
                context.append(", ")
                        .append(metrics.getReplenishmentSuggestions()).append(" sugerencias de reposicion, costo estimado ")
                        .append(metrics.getEstimatedReplenishmentCost());
            } else {
                context.append(", ")
                        .append(metrics.getLowStockAlerts()).append(" stock bajo, ")
                        .append(metrics.getExpirationAlerts()).append(" vencimientos proximos");
            }
            context.append(".\n");
        }

        appendAlerts(context, insights.getAlerts());
        if (!bartenderScope) {
            appendReplenishment(context, insights.getReplenishmentSuggestions());
        }
        return context.toString();
    }

    private String ollamaUnavailableMessage(Throwable ex) {
        if (isTimeout(ex)) {
            return "Ollama tardó demasiado en responder (timeout de " + timeout.toSeconds()
                    + " s). En CPU la primera respuesta puede tardar varios minutos; espera y vuelve a intentar.";
        }
        return "No se pudo conectar con Ollama. Verifica que el servicio local este activo "
                + "(ollama serve o contenedor ollama en ejecución).";
    }

    private boolean isTimeout(Throwable ex) {
        for (Throwable current = ex; current != null; current = current.getCause()) {
            if (current instanceof TimeoutException) {
                return true;
            }
        }
        return false;
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
