package com.bar.inventory.controller;

import com.bar.inventory.config.GlobalExceptionHandler;
import com.bar.inventory.dto.ShiftDto;
import com.bar.inventory.service.WorkShiftService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveSecurityAutoConfiguration;
import org.springframework.boot.autoconfigure.security.reactive.ReactiveUserDetailsServiceAutoConfiguration;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(
        controllers = WorkShiftController.class,
        excludeAutoConfiguration = {
                ReactiveSecurityAutoConfiguration.class,
                ReactiveUserDetailsServiceAutoConfiguration.class
        }
)
@Import(GlobalExceptionHandler.class)
class WorkShiftControllerWebFluxTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private WorkShiftService workShiftService;

    @Test
    void createShouldReturnCreatedShift() {
        when(workShiftService.create(any())).thenReturn(Mono.just(shiftDto()));

        webTestClient.post()
                .uri("/api/shifts")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                        {
                          "userId": 6,
                          "locationId": 1,
                          "roleName": "CAJERO",
                          "scheduledStart": "2026-04-15T18:00:00Z",
                          "scheduledEnd": "2026-04-16T02:00:00Z",
                          "notes": "Turno noche"
                        }
                        """)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.id").isEqualTo(30)
                .jsonPath("$.roleName").isEqualTo("CAJERO")
                .jsonPath("$.status").isEqualTo("SCHEDULED");
    }

    @Test
    void findMineShouldReturnCurrentUserShifts() {
        when(workShiftService.findMyShifts()).thenReturn(Flux.just(shiftDto()));

        webTestClient.get()
                .uri("/api/shifts/me")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$[0].id").isEqualTo(30)
                .jsonPath("$[0].locationName").isEqualTo("Bodega Principal");
    }

    private ShiftDto shiftDto() {
        ShiftDto dto = new ShiftDto();
        dto.setId(30L);
        dto.setUserId(6L);
        dto.setUsername("cajero1");
        dto.setFullName("Caja Principal");
        dto.setLocationId(1L);
        dto.setLocationName("Bodega Principal");
        dto.setRoleName("CAJERO");
        dto.setScheduledStart(Instant.parse("2026-04-15T18:00:00Z"));
        dto.setScheduledEnd(Instant.parse("2026-04-16T02:00:00Z"));
        dto.setStatus("SCHEDULED");
        dto.setNotes("Turno noche");
        return dto;
    }
}
