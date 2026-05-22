package com.bar.inventory.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class AiSystemKnowledgeServiceTest {

    private AiSystemKnowledgeService service;

    @BeforeEach
    void setUp() {
        service = new AiSystemKnowledgeService();
        service.loadKnowledge();
    }

    @Test
    void shouldLoadFullKnowledge() {
        String knowledge = service.getKnowledge(false);
        assertThat(knowledge).contains("Bar Inventory System");
        assertThat(knowledge).contains("ADMINISTRADOR");
        assertThat(knowledge).contains("PURCHASE");
    }

    @Test
    void shouldLoadBartenderKnowledge() {
        String knowledge = service.getKnowledge(true);
        assertThat(knowledge).contains("bartender");
        assertThat(knowledge).doesNotContain("Valorización del inventario");
    }
}
