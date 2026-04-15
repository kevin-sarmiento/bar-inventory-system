package com.bar.inventory.controller;

import com.bar.inventory.config.GlobalExceptionHandler;
import com.bar.inventory.dto.UserAdminDto;
import com.bar.inventory.service.UserAdminService;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(
        controllers = UserAdminController.class,
        excludeAutoConfiguration = {
                ReactiveSecurityAutoConfiguration.class,
                ReactiveUserDetailsServiceAutoConfiguration.class
        }
)
@Import(GlobalExceptionHandler.class)
class UserAdminControllerWebFluxTest {

    @Autowired
    private WebTestClient webTestClient;

    @MockBean
    private UserAdminService userAdminService;

    @Test
    void createShouldReturnCreatedUser() {
        UserAdminDto dto = userDto();
        when(userAdminService.createUser(any())).thenReturn(Mono.just(dto));

        webTestClient.post()
                .uri("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue("""
                        {
                          "username": "cajero1",
                          "fullName": "Caja Principal",
                          "email": "cajero1@bar.local",
                          "password": "Temp1234",
                          "active": true,
                          "roleNames": ["CAJERO"]
                        }
                        """)
                .exchange()
                .expectStatus().isCreated()
                .expectBody()
                .jsonPath("$.username").isEqualTo("cajero1")
                .jsonPath("$.roles[0]").isEqualTo("CAJERO");
    }

    @Test
    void findAllShouldReturnUsers() {
        when(userAdminService.findAllUsers()).thenReturn(Flux.just(userDto()));

        webTestClient.get()
                .uri("/api/users")
                .exchange()
                .expectStatus().isOk()
                .expectBody()
                .jsonPath("$[0].username").isEqualTo("cajero1")
                .jsonPath("$[0].active").isEqualTo(true);
    }

    private UserAdminDto userDto() {
        UserAdminDto dto = new UserAdminDto();
        dto.setId(10L);
        dto.setUsername("cajero1");
        dto.setFullName("Caja Principal");
        dto.setEmail("cajero1@bar.local");
        dto.setActive(true);
        dto.setRoles(List.of("CAJERO"));
        return dto;
    }
}
