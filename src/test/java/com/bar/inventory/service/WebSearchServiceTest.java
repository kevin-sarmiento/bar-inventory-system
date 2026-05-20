package com.bar.inventory.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WebSearchServiceTest {

    @Test
    void toSearchQueryShouldStripFillerPrefix() {
        String q = WebSearchService.toSearchQuery("Por favor busca en la web que dia es hoy");
        assertEquals("que dia es hoy", q);
    }

    @Test
    void toSearchQueryShouldTruncateLongMessages() {
        String longMessage = "a".repeat(250);
        assertTrue(WebSearchService.toSearchQuery(longMessage).length() <= 180);
    }
}
