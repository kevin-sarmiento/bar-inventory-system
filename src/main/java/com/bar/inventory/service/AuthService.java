package com.bar.inventory.service;

import com.bar.inventory.dto.AuthRequest;
import com.bar.inventory.dto.AuthResponse;
import com.bar.inventory.model.User;
import com.bar.inventory.repository.UserRepository;
import com.bar.inventory.security.JwtUtil;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DatabaseClient databaseClient;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil,
                       DatabaseClient databaseClient) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.databaseClient = databaseClient;
    }

    public Mono<AuthResponse> login(AuthRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> validatePassword(user, request.getPassword()))
                .flatMap(user -> loadRoles(user.getUsername())
                        .map(roles -> new AuthResponse(jwtUtil.generateToken(user.getUsername(), roles))));
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
        return databaseClient.sql("""
                        SELECT r.role_name
                        FROM user_roles ur
                        JOIN roles r ON r.role_id = ur.role_id
                        JOIN app_users u ON u.user_id = ur.user_id
                        WHERE u.username = :username
                        """)
                .bind("username", username)
                .map((row, metadata) -> row.get("role_name", String.class))
                .all()
                .collectList()
                .map(roles -> roles.isEmpty() ? List.of("USER") : roles);
    }
}
