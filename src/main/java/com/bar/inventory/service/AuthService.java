package com.bar.inventory.service;

import com.bar.inventory.dto.AuthRequest;
import com.bar.inventory.dto.AuthResponse;
import com.bar.inventory.model.User;
import com.bar.inventory.security.JwtUtil;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

@Service
public class AuthService {

    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DatabaseClient databaseClient;

    public AuthService(PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       DatabaseClient databaseClient) {
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.databaseClient = databaseClient;
    }

    public Mono<AuthResponse> login(AuthRequest request) {
        return findByUsername(request.getUsername())
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> validatePassword(user, request.getPassword()))
                .flatMap(user -> loadRoles(user.getUsername())
                        .map(roles -> new AuthResponse(jwtUtil.generateToken(user.getUsername(), roles, user.getId()))));
    }

    private Mono<User> validatePassword(User user, String rawPassword) {
        if (!user.getActive()) {
            return Mono.error(new IllegalStateException("Usuario inactivo"));
        }
        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            return Mono.error(new IllegalArgumentException("Credenciales inválidas"));
        }
        return Mono.just(user);
    }

    private Mono<List<String>> loadRoles(String username) {
        String safeUsername = escapeSqlLiteral(username);
        return databaseClient.sql("""
                        SELECT r.role_name
                        FROM user_roles ur
                        JOIN roles r ON r.role_id = ur.role_id
                        JOIN app_users u ON u.user_id = ur.user_id
                        WHERE u.username = '%s'
                        """.formatted(safeUsername))
                .map((row, metadata) -> row.get("role_name", String.class))
                .all()
                .collectList()
                .map(roles -> roles.isEmpty() ? List.of("USER") : roles);
    }

    private Mono<User> findByUsername(String username) {
        String safeUsername = escapeSqlLiteral(username);
        return databaseClient.sql("""
                        SELECT user_id, username, full_name, email, password_hash, is_active, created_at, updated_at
                        FROM app_users
                        WHERE username = '%s'
                        """.formatted(safeUsername))
                .map((row, metadata) -> {
                    User user = new User();
                    user.setId(row.get("user_id", Long.class));
                    user.setUsername(row.get("username", String.class));
                    user.setFullName(row.get("full_name", String.class));
                    user.setEmail(row.get("email", String.class));
                    user.setPasswordHash(row.get("password_hash", String.class));
                    user.setActive(row.get("is_active", Boolean.class));
                    user.setCreatedAt(row.get("created_at", Instant.class));
                    user.setUpdatedAt(row.get("updated_at", Instant.class));
                    return user;
                })
                .one();
    }

    private String escapeSqlLiteral(String value) {
        return value == null ? "" : value.replace("'", "''");
    }
}
