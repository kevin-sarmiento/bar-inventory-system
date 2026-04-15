package com.bar.inventory.config;

import jakarta.validation.ConstraintViolationException;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.support.WebExchangeBindException;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public Mono<ResponseEntity<Map<String, String>>> handleBadRequest(IllegalArgumentException ex) {
        return Mono.just(ResponseEntity.badRequest().body(Map.of("error", ex.getMessage())));
    }

    @ExceptionHandler(IllegalStateException.class)
    public Mono<ResponseEntity<Map<String, String>>> handleConflict(IllegalStateException ex) {
        return Mono.just(ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage())));
    }

    @ExceptionHandler(DataAccessException.class)
    public Mono<ResponseEntity<Map<String, String>>> handleDataAccess(DataAccessException ex) {
        return Mono.just(ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                .body(Map.of("error", "Error de base de datos", "details", ex.getMostSpecificCause().getMessage())));
    }

    @ExceptionHandler(WebExchangeBindException.class)
    public Mono<ResponseEntity<Map<String, Object>>> handleValidation(WebExchangeBindException ex) {
        List<Map<String, String>> fields = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(this::toFieldMap)
                .toList();
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("error", "Error de validacion");
        body.put("fields", fields);
        return Mono.just(ResponseEntity.badRequest().body(body));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public Mono<ResponseEntity<Map<String, String>>> handleConstraintViolation(ConstraintViolationException ex) {
        return Mono.just(ResponseEntity.badRequest().body(Map.of("error", ex.getMessage())));
    }

    @ExceptionHandler(Exception.class)
    public Mono<ResponseEntity<Map<String, String>>> handleGeneric(Exception ex) {
        return Mono.just(ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Error interno", "details", ex.getMessage())));
    }

    private Map<String, String> toFieldMap(FieldError error) {
        return Map.of(
                "field", error.getField(),
                "message", error.getDefaultMessage() == null ? "valor invalido" : error.getDefaultMessage()
        );
    }
}
