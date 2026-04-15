package com.bar.inventory.service;

import com.bar.inventory.dto.CreateUserRequest;
import com.bar.inventory.dto.RoleDto;
import com.bar.inventory.dto.UserAdminDto;
import com.bar.inventory.model.User;
import com.bar.inventory.repository.UserRepository;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;

@Service
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DatabaseClient databaseClient;

    public UserAdminService(UserRepository userRepository,
                            PasswordEncoder passwordEncoder,
                            DatabaseClient databaseClient) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.databaseClient = databaseClient;
    }

    public Flux<UserAdminDto> findAllUsers() {
        return databaseClient.sql("""
                        SELECT
                            u.user_id,
                            u.username,
                            u.full_name,
                            u.email,
                            u.is_active,
                            u.created_at,
                            u.updated_at,
                            COALESCE(string_agg(r.role_name, ',' ORDER BY r.role_name), '') AS roles
                        FROM app_users u
                        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
                        LEFT JOIN roles r ON r.role_id = ur.role_id
                        GROUP BY u.user_id, u.username, u.full_name, u.email, u.is_active, u.created_at, u.updated_at
                        ORDER BY u.user_id
                        """)
                .map((row, metadata) -> mapUserAdminDto(
                        row.get("user_id", Long.class),
                        row.get("username", String.class),
                        row.get("full_name", String.class),
                        row.get("email", String.class),
                        row.get("is_active", Boolean.class),
                        row.get("created_at", Instant.class),
                        row.get("updated_at", Instant.class),
                        row.get("roles", String.class)
                ))
                .all();
    }

    public Mono<UserAdminDto> findUserById(Long userId) {
        return databaseClient.sql("""
                        SELECT
                            u.user_id,
                            u.username,
                            u.full_name,
                            u.email,
                            u.is_active,
                            u.created_at,
                            u.updated_at,
                            COALESCE(string_agg(r.role_name, ',' ORDER BY r.role_name), '') AS roles
                        FROM app_users u
                        LEFT JOIN user_roles ur ON ur.user_id = u.user_id
                        LEFT JOIN roles r ON r.role_id = ur.role_id
                        WHERE u.user_id = %d
                        GROUP BY u.user_id, u.username, u.full_name, u.email, u.is_active, u.created_at, u.updated_at
                        """.formatted(userId))
                .map((row, metadata) -> mapUserAdminDto(
                        row.get("user_id", Long.class),
                        row.get("username", String.class),
                        row.get("full_name", String.class),
                        row.get("email", String.class),
                        row.get("is_active", Boolean.class),
                        row.get("created_at", Instant.class),
                        row.get("updated_at", Instant.class),
                        row.get("roles", String.class)
                ))
                .one()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")));
    }

    public Mono<UserAdminDto> createUser(CreateUserRequest request) {
        validatePassword(request.getPassword());
        User user = new User();
        user.setUsername(normalizeUsername(request.getUsername()));
        user.setFullName(request.getFullName());
        user.setEmail(normalizeEmail(request.getEmail()));
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setActive(request.getActive() == null ? Boolean.TRUE : request.getActive());

        List<String> roleNames = normalizeRoleNames(request.getRoleNames(), true);

        return userRepository.save(user)
                .onErrorMap(DuplicateKeyException.class,
                        ex -> new IllegalArgumentException("username o email ya existe"))
                .flatMap(saved -> replaceUserRoles(saved.getId(), roleNames).thenReturn(saved))
                .flatMap(saved -> findUserById(saved.getId()));
    }

    public Mono<UserAdminDto> setActive(Long userId, boolean active) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> {
                    user.setActive(active);
                    return userRepository.save(user);
                })
                .flatMap(saved -> findUserById(saved.getId()));
    }

    public Mono<UserAdminDto> assignRoles(Long userId, List<String> roleNames) {
        List<String> normalizedRoles = normalizeRoleNames(roleNames, true);
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> replaceUserRoles(userId, normalizedRoles))
                .then(findUserById(userId));
    }

    public Mono<Void> resetPassword(Long userId, String temporaryPassword) {
        validatePassword(temporaryPassword);
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> {
                    user.setPasswordHash(passwordEncoder.encode(temporaryPassword));
                    return userRepository.save(user);
                })
                .then();
    }

    public Flux<RoleDto> findAllRoles() {
        return databaseClient.sql("""
                        SELECT role_id, role_name, description
                        FROM roles
                        ORDER BY role_name
                        """)
                .map((row, metadata) -> {
                    RoleDto dto = new RoleDto();
                    dto.setId(row.get("role_id", Long.class));
                    dto.setName(row.get("role_name", String.class));
                    dto.setDescription(row.get("description", String.class));
                    return dto;
                })
                .all();
    }

    private Mono<Void> replaceUserRoles(Long userId, List<String> roleNames) {
        return ensureRolesExist(roleNames)
                .then(databaseClient.sql("DELETE FROM user_roles WHERE user_id = %d".formatted(userId))
                        .fetch()
                        .rowsUpdated()
                        .then())
                .thenMany(Flux.fromIterable(roleNames)
                        .concatMap(roleName -> databaseClient.sql("""
                                        INSERT INTO user_roles (user_id, role_id)
                                        SELECT %d, role_id
                                        FROM roles
                                        WHERE role_name = '%s'
                                        ON CONFLICT (user_id, role_id) DO NOTHING
                                        """.formatted(userId, escapeSqlLiteral(roleName)))
                                .fetch()
                                .rowsUpdated()))
                .then();
    }

    private Mono<Void> ensureRolesExist(List<String> roleNames) {
        String rolesCsv = roleNames.stream()
                .map(role -> "'" + escapeSqlLiteral(role) + "'")
                .reduce((left, right) -> left + ", " + right)
                .orElse("");

        return databaseClient.sql("""
                        SELECT role_name
                        FROM roles
                        WHERE role_name IN (%s)
                        """.formatted(rolesCsv))
                .map((row, metadata) -> row.get("role_name", String.class))
                .all()
                .collectList()
                .flatMap(existingRoles -> {
                    List<String> missingRoles = roleNames.stream()
                            .filter(role -> !existingRoles.contains(role))
                            .toList();
                    if (!missingRoles.isEmpty()) {
                        return Mono.error(new IllegalArgumentException(
                                "Roles no encontrados: " + String.join(", ", missingRoles)));
                    }
                    return Mono.empty();
                });
    }

    private UserAdminDto mapUserAdminDto(Long id,
                                         String username,
                                         String fullName,
                                         String email,
                                         Boolean active,
                                         Instant createdAt,
                                         Instant updatedAt,
                                         String rolesCsv) {
        UserAdminDto dto = new UserAdminDto();
        dto.setId(id);
        dto.setUsername(username);
        dto.setFullName(fullName);
        dto.setEmail(email);
        dto.setActive(active);
        dto.setCreatedAt(createdAt);
        dto.setUpdatedAt(updatedAt);
        dto.setRoles(parseRoles(rolesCsv));
        return dto;
    }

    private List<String> parseRoles(String rolesCsv) {
        if (rolesCsv == null || rolesCsv.isBlank()) {
            return List.of();
        }
        return List.of(rolesCsv.split(","));
    }

    private List<String> normalizeRoleNames(List<String> roleNames, boolean defaultAdminIfEmpty) {
        List<String> normalized = roleNames == null ? List.of() : roleNames.stream()
                .filter(role -> role != null && !role.isBlank())
                .map(role -> role.trim().toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        if (normalized.isEmpty()) {
            return defaultAdminIfEmpty ? List.of("CAJERO") : List.of();
        }
        return List.copyOf(new LinkedHashSet<>(normalized));
    }

    private String normalizeUsername(String username) {
        return username == null ? null : username.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            return null;
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 6) {
            throw new IllegalArgumentException("La contraseña debe tener al menos 6 caracteres");
        }
    }

    private String escapeSqlLiteral(String value) {
        return value == null ? "" : value.replace("'", "''");
    }
}
