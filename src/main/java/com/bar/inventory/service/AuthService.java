package com.bar.inventory.service;

import com.bar.inventory.dto.AuthRequest;
import com.bar.inventory.dto.AuthResponse;
import com.bar.inventory.model.User;
import com.bar.inventory.repository.UserRepository;
import com.bar.inventory.security.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.List;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    public Mono<AuthResponse> login(AuthRequest request) {
        return userRepository.findByUsername(request.getUsername())
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> validatePassword(user, request.getPassword()))
                .map(user -> new AuthResponse(jwtUtil.generateToken(user.getUsername(), List.of("USER"))));
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
}
