package com.bar.inventory.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Service
public class AiSystemKnowledgeService {
    private static final Logger log = LoggerFactory.getLogger(AiSystemKnowledgeService.class);
    private static final String FULL_RESOURCE = "ai/system-knowledge-full.md";
    private static final String BARTENDER_RESOURCE = "ai/system-knowledge-bartender.md";
    private static final int MAX_KNOWLEDGE_CHARS = 12_000;

    private String fullKnowledge = "";
    private String bartenderKnowledge = "";

    @PostConstruct
    void loadKnowledge() {
        fullKnowledge = truncate(loadResource(FULL_RESOURCE));
        bartenderKnowledge = truncate(loadResource(BARTENDER_RESOURCE));
        log.info("Base de conocimiento IA cargada (completa: {} chars, bartender: {} chars)",
                fullKnowledge.length(), bartenderKnowledge.length());
    }

    public String getKnowledge(boolean bartenderScope) {
        return bartenderScope ? bartenderKnowledge : fullKnowledge;
    }

    private String loadResource(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            if (!resource.exists()) {
                log.warn("Archivo de conocimiento IA no encontrado: {}", path);
                return "";
            }
            return resource.getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            log.error("No se pudo leer conocimiento IA desde {}", path, ex);
            return "";
        }
    }

    private static String truncate(String value) {
        if (value == null || value.length() <= MAX_KNOWLEDGE_CHARS) {
            return value == null ? "" : value;
        }
        return value.substring(0, MAX_KNOWLEDGE_CHARS).strip() + "\n\n[... documentacion truncada por limite de contexto ...]";
    }
}
