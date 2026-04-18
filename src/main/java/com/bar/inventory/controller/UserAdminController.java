package com.bar.inventory.controller;

import com.bar.inventory.dto.AssignRolesRequest;
import com.bar.inventory.dto.CreateUserRequest;
import com.bar.inventory.dto.ResetPasswordRequest;
import com.bar.inventory.dto.RoleDto;
import com.bar.inventory.dto.UserAdminDto;
import com.bar.inventory.service.UserAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping(path = "/api/users", produces = MediaType.APPLICATION_JSON_VALUE)
public class UserAdminController {

    private final UserAdminService userAdminService;

    public UserAdminController(UserAdminService userAdminService) {
        this.userAdminService = userAdminService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<UserAdminDto> findAll() {
        return userAdminService.findAllUsers();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Mono<UserAdminDto> findById(@PathVariable("id") Long id) {
        return userAdminService.findUserById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Mono<UserAdminDto> create(@Valid @RequestBody CreateUserRequest request) {
        return userAdminService.createUser(request);
    }

    @PatchMapping("/{id}/active")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Mono<UserAdminDto> setActive(@PathVariable("id") Long id,
                                        @RequestParam("value") boolean value) {
        return userAdminService.setActive(id, value);
    }

    @PutMapping(path = "/{id}/roles", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Mono<UserAdminDto> assignRoles(@PathVariable("id") Long id,
                                          @Valid @RequestBody AssignRolesRequest request) {
        return userAdminService.assignRoles(id, request.getRoleNames());
    }

    @PutMapping(path = "/{id}/password", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Mono<Map<String, String>> resetPassword(@PathVariable("id") Long id,
                                                   @Valid @RequestBody ResetPasswordRequest request) {
        return userAdminService.resetPassword(id, request.getTemporaryPassword())
                .thenReturn(Map.of("status", "password-updated"));
    }

    @GetMapping("/roles/catalog")
    @PreAuthorize("hasRole('ADMINISTRADOR')")
    public Flux<RoleDto> findRoles() {
        return userAdminService.findAllRoles();
    }
}
