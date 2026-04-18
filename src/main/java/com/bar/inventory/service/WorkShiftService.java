package com.bar.inventory.service;

import com.bar.inventory.dto.CreateShiftRequest;
import com.bar.inventory.dto.ShiftDto;
import com.bar.inventory.model.WorkShift;
import com.bar.inventory.model.User;
import com.bar.inventory.repository.LocationRepository;
import com.bar.inventory.repository.UserRepository;
import com.bar.inventory.repository.WorkShiftRepository;
import org.springframework.r2dbc.core.DatabaseClient;
import org.springframework.r2dbc.core.RowsFetchSpec;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import static org.springframework.http.HttpStatus.FORBIDDEN;

@Service
public class WorkShiftService {
    private final WorkShiftRepository workShiftRepository;
    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final DatabaseClient databaseClient;

    public WorkShiftService(WorkShiftRepository workShiftRepository,
                            UserRepository userRepository,
                            LocationRepository locationRepository,
                            DatabaseClient databaseClient) {
        this.workShiftRepository = workShiftRepository;
        this.userRepository = userRepository;
        this.locationRepository = locationRepository;
        this.databaseClient = databaseClient;
    }

    public Flux<ShiftDto> findAll() {
        return baseShiftQuery(null).all();
    }

    public Mono<ShiftDto> findById(Long id) {
        return ensureCanAccessShift(id)
                .then(baseShiftQuery("WHERE ws.shift_id = %d".formatted(id)).one())
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")));
    }

    public Flux<ShiftDto> findMyShifts() {
        return currentUser()
                .flatMapMany(user -> baseShiftQuery("WHERE ws.user_id = %d".formatted(user.getId())).all());
    }

    /**
     * Turnos aptos para asociar una venta (programado o en curso) en la sede indicada.
     * Cajero/bartender: solo los propios. Administrador/gerente: todos los de esa ubicacion.
     */
    public Flux<ShiftDto> findShiftsEligibleForSale(Long locationId) {
        if (locationId == null || locationId <= 0) {
            return Flux.error(new IllegalArgumentException("locationId es obligatorio"));
        }
        return currentUser()
                .flatMapMany(ctx -> {
                    String where = isManager(ctx)
                            ? """
                                    WHERE ws.location_id = %d
                                      AND ws.status IN ('SCHEDULED', 'IN_PROGRESS')
                                    """.formatted(locationId)
                            : """
                                    WHERE ws.location_id = %d
                                      AND ws.user_id = %d
                                      AND ws.status IN ('SCHEDULED', 'IN_PROGRESS')
                                    """.formatted(locationId, ctx.getId());
                    return baseShiftQuery(where).all();
                });
    }

    public Mono<ShiftDto> create(CreateShiftRequest request) {
        validateShiftRequest(request);
        String normalizedRole = normalizeRoleName(request.getRoleName());
        return ensureUserExists(request.getUserId())
                .then(ensureLocationExists(request.getLocationId()))
                .then(ensureRoleExists(normalizedRole))
                .then(ensureNoOverlappingShift(request.getUserId(), request.getScheduledStart(), request.getScheduledEnd(), null))
                .then(workShiftRepository.save(toEntity(request, normalizedRole)))
                .flatMap(saved -> findShiftByIdInternal(saved.getId()));
    }

    public Mono<ShiftDto> update(Long id, CreateShiftRequest request) {
        validateShiftRequest(request);
        String normalizedRole = normalizeRoleName(request.getRoleName());
        return workShiftRepository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                .flatMap(existing -> {
                    if (!"SCHEDULED".equals(existing.getStatus())) {
                        return Mono.error(new IllegalStateException("Solo se puede editar un turno en estado SCHEDULED"));
                    }
                    return ensureUserExists(request.getUserId())
                            .then(ensureLocationExists(request.getLocationId()))
                            .then(ensureRoleExists(normalizedRole))
                            .then(ensureNoOverlappingShift(request.getUserId(), request.getScheduledStart(), request.getScheduledEnd(), existing.getId()))
                            .then(Mono.defer(() -> {
                                existing.setUserId(request.getUserId());
                                existing.setLocationId(request.getLocationId());
                                existing.setRoleName(normalizedRole);
                                existing.setScheduledStart(request.getScheduledStart());
                                existing.setScheduledEnd(request.getScheduledEnd());
                                existing.setNotes(request.getNotes());
                                existing.setStatus("SCHEDULED");
                                existing.setActualStart(null);
                                existing.setActualEnd(null);
                                return workShiftRepository.save(existing);
                            }));
                })
                .flatMap(saved -> findShiftByIdInternal(saved.getId()));
    }

    public Mono<ShiftDto> cancel(Long id) {
        return workShiftRepository.findById(id)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                .flatMap(shift -> {
                    if ("CANCELLED".equals(shift.getStatus())) {
                        return Mono.error(new IllegalStateException("El turno ya esta cancelado"));
                    }
                    if ("IN_PROGRESS".equals(shift.getStatus())) {
                        return Mono.error(new IllegalStateException("No se puede cancelar un turno en progreso"));
                    }
                    if ("COMPLETED".equals(shift.getStatus())) {
                        return Mono.error(new IllegalStateException("No se puede cancelar un turno completado"));
                    }
                    shift.setStatus("CANCELLED");
                    return workShiftRepository.save(shift);
                })
                .flatMap(saved -> findShiftByIdInternal(saved.getId()));
    }

    public Mono<ShiftDto> checkIn(Long id) {
        return ensureCanOperateShift(id)
                .then(workShiftRepository.findById(id))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                .flatMap(shift -> {
                    if (!"SCHEDULED".equals(shift.getStatus())) {
                        return Mono.error(new IllegalStateException("Solo se puede hacer check-in en turnos programados"));
                    }
                    if (shift.getActualStart() != null) {
                        return Mono.error(new IllegalStateException("El turno ya tiene una hora de entrada registrada"));
                    }
                    shift.setActualStart(Instant.now());
                    shift.setStatus("IN_PROGRESS");
                    return workShiftRepository.save(shift);
                })
                .flatMap(saved -> findShiftByIdInternal(saved.getId()));
    }

    public Mono<ShiftDto> checkOut(Long id) {
        return ensureCanOperateShift(id)
                .then(workShiftRepository.findById(id))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                .flatMap(shift -> {
                    if (!"IN_PROGRESS".equals(shift.getStatus())) {
                        return Mono.error(new IllegalStateException("Solo se puede hacer check-out en turnos en progreso"));
                    }
                    if (shift.getActualStart() == null) {
                        return Mono.error(new IllegalStateException("No se puede hacer check-out sin check-in previo"));
                    }
                    Instant checkoutTime = Instant.now();
                    if (!checkoutTime.isAfter(shift.getActualStart())) {
                        return Mono.error(new IllegalStateException("La hora de salida debe ser posterior a la hora de entrada"));
                    }
                    shift.setActualEnd(checkoutTime);
                    shift.setStatus("COMPLETED");
                    return workShiftRepository.save(shift);
                })
                .flatMap(saved -> findShiftByIdInternal(saved.getId()));
    }

    private RowsFetchSpec<ShiftDto> baseShiftQuery(String whereClause) {
        return databaseClient.sql("""
                SELECT
                    ws.shift_id,
                    ws.user_id,
                    u.username,
                    u.full_name,
                    ws.location_id,
                    l.location_name,
                    ws.role_name,
                    ws.scheduled_start,
                    ws.scheduled_end,
                    ws.actual_start,
                    ws.actual_end,
                    ws.status,
                    ws.notes,
                    ws.created_at,
                    ws.updated_at
                FROM work_shifts ws
                JOIN app_users u ON u.user_id = ws.user_id
                JOIN locations l ON l.location_id = ws.location_id
                %s
                ORDER BY ws.scheduled_start DESC, ws.shift_id DESC
                """.formatted(whereClause == null ? "" : whereClause))
                .map((row, metadata) -> {
                    ShiftDto dto = new ShiftDto();
                    dto.setId(row.get("shift_id", Long.class));
                    dto.setUserId(row.get("user_id", Long.class));
                    dto.setUsername(row.get("username", String.class));
                    dto.setFullName(row.get("full_name", String.class));
                    dto.setLocationId(row.get("location_id", Long.class));
                    dto.setLocationName(row.get("location_name", String.class));
                    dto.setRoleName(row.get("role_name", String.class));
                    dto.setScheduledStart(row.get("scheduled_start", Instant.class));
                    dto.setScheduledEnd(row.get("scheduled_end", Instant.class));
                    dto.setActualStart(row.get("actual_start", Instant.class));
                    dto.setActualEnd(row.get("actual_end", Instant.class));
                    dto.setStatus(row.get("status", String.class));
                    dto.setNotes(row.get("notes", String.class));
                    dto.setCreatedAt(row.get("created_at", Instant.class));
                    dto.setUpdatedAt(row.get("updated_at", Instant.class));
                    return dto;
                });
    }

    private Mono<ShiftDto> findShiftByIdInternal(Long id) {
        return baseShiftQuery("WHERE ws.shift_id = %d".formatted(id))
                .one()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")));
    }

    private Mono<Void> ensureCanAccessShift(Long shiftId) {
        return currentUser()
                .flatMap(user -> {
                    if (isManager(user)) {
                        return Mono.empty();
                    }
                    return workShiftRepository.findById(shiftId)
                            .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                            .flatMap(shift -> shift.getUserId().equals(user.getId())
                                    ? Mono.<Void>empty()
                                    : Mono.error(new ResponseStatusException(FORBIDDEN, "No puedes ver este turno")));
                });
    }

    private Mono<Void> ensureCanOperateShift(Long shiftId) {
        return currentUser()
                .flatMap(user -> {
                    if (isManager(user)) {
                        return Mono.empty();
                    }
                    return workShiftRepository.findById(shiftId)
                            .switchIfEmpty(Mono.error(new IllegalArgumentException("Turno no encontrado")))
                            .flatMap(shift -> shift.getUserId().equals(user.getId())
                                    ? Mono.<Void>empty()
                                    : Mono.error(new ResponseStatusException(FORBIDDEN, "No puedes operar este turno")));
                });
    }

    private Mono<UserContext> currentUser() {
        return ReactiveSecurityContextHolder.getContext()
                .map(ctx -> ctx.getAuthentication())
                .flatMap(auth -> userRepository.findByUsername(auth.getName())
                        .map(user -> new UserContext(user,
                                auth.getAuthorities().stream()
                                        .map(authority -> authority.getAuthority())
                                        .toList())))
                .switchIfEmpty(Mono.error(new ResponseStatusException(FORBIDDEN, "Usuario no autenticado")));
    }

    private boolean isManager(UserContext user) {
        return user.authorities().contains("ROLE_ADMINISTRADOR") || user.authorities().contains("ROLE_GERENTE");
    }

    private Mono<Void> ensureUserExists(Long userId) {
        return userRepository.findById(userId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Usuario no encontrado")))
                .flatMap(user -> Boolean.TRUE.equals(user.getActive())
                        ? Mono.<Void>empty()
                        : Mono.error(new IllegalStateException("El usuario asignado esta inactivo")));
    }

    private Mono<Void> ensureLocationExists(Long locationId) {
        return locationRepository.findById(locationId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ubicacion no encontrada")))
                .then();
    }

    private Mono<Void> ensureRoleExists(String roleName) {
        return databaseClient.sql("""
                        SELECT role_name
                        FROM roles
                        WHERE role_name = '%s'
                        """.formatted(escapeSqlLiteral(roleName)))
                .map((row, metadata) -> row.get("role_name", String.class))
                .one()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Rol no encontrado")))
                .then();
    }

    private WorkShift toEntity(CreateShiftRequest request, String normalizedRole) {
        WorkShift shift = new WorkShift();
        shift.setUserId(request.getUserId());
        shift.setLocationId(request.getLocationId());
        shift.setRoleName(normalizedRole);
        shift.setScheduledStart(request.getScheduledStart());
        shift.setScheduledEnd(request.getScheduledEnd());
        shift.setStatus("SCHEDULED");
        shift.setNotes(request.getNotes());
        return shift;
    }

    private void validateShiftRequest(CreateShiftRequest request) {
        if (request.getUserId() == null || request.getUserId() <= 0) {
            throw new IllegalArgumentException("userId es obligatorio");
        }
        if (request.getLocationId() == null || request.getLocationId() <= 0) {
            throw new IllegalArgumentException("locationId es obligatorio");
        }
        if (request.getScheduledStart() == null || request.getScheduledEnd() == null) {
            throw new IllegalArgumentException("scheduledStart y scheduledEnd son obligatorios");
        }
        if (request.getScheduledStart() != null && request.getScheduledEnd() != null
                && !request.getScheduledEnd().isAfter(request.getScheduledStart())) {
            throw new IllegalArgumentException("scheduledEnd debe ser mayor que scheduledStart");
        }
        String roleName = normalizeRoleName(request.getRoleName());
        if (roleName.isBlank()) {
            throw new IllegalArgumentException("roleName es obligatorio");
        }
    }

    private Mono<Void> ensureNoOverlappingShift(Long userId, Instant start, Instant end, Long excludeShiftId) {
        return workShiftRepository.findByUserIdOrderByScheduledStartDesc(userId)
                .filter(shift -> excludeShiftId == null || !shift.getId().equals(excludeShiftId))
                .filter(shift -> !"CANCELLED".equals(shift.getStatus()) && !"MISSED".equals(shift.getStatus()))
                .filter(shift -> overlaps(start, end, shift.getScheduledStart(), shift.getScheduledEnd()))
                .next()
                .flatMap(shift -> Mono.error(new IllegalStateException("El usuario ya tiene un turno solapado en ese horario")))
                .then();
    }

    private boolean overlaps(Instant startA, Instant endA, Instant startB, Instant endB) {
        return startA.isBefore(endB) && endA.isAfter(startB);
    }

    private String normalizeRoleName(String roleName) {
        return roleName == null ? "" : roleName.trim().toUpperCase(Locale.ROOT);
    }

    private String escapeSqlLiteral(String value) {
        return value == null ? "" : value.replace("'", "''");
    }

    private record UserContext(User user, List<String> authorities) {
        Long getId() {
            return user.getId();
        }
    }
}
