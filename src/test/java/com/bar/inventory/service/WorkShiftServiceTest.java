package com.bar.inventory.service;

import com.bar.inventory.dto.CreateShiftRequest;
import com.bar.inventory.model.WorkShift;
import com.bar.inventory.repository.LocationRepository;
import com.bar.inventory.repository.UserRepository;
import com.bar.inventory.repository.WorkShiftRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.r2dbc.core.DatabaseClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkShiftServiceTest {

    @Mock
    private WorkShiftRepository workShiftRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private LocationRepository locationRepository;
    @Mock
    private DatabaseClient databaseClient;

    @Test
    void createShouldRejectMissingUserId() {
        WorkShiftService service = new WorkShiftService(workShiftRepository, userRepository, locationRepository, databaseClient);
        CreateShiftRequest request = validRequest();
        request.setUserId(null);

        assertThrows(IllegalArgumentException.class, () -> service.create(request));
    }

    @Test
    void cancelShouldRejectInProgressShift() {
        WorkShiftService service = new WorkShiftService(workShiftRepository, userRepository, locationRepository, databaseClient);
        WorkShift shift = new WorkShift();
        shift.setId(5L);
        shift.setStatus("IN_PROGRESS");
        when(workShiftRepository.findById(5L)).thenReturn(Mono.just(shift));

        StepVerifier.create(service.cancel(5L))
                .expectError(IllegalStateException.class)
                .verify();
    }

    private CreateShiftRequest validRequest() {
        CreateShiftRequest request = new CreateShiftRequest();
        request.setUserId(1L);
        request.setLocationId(1L);
        request.setRoleName("CAJERO");
        request.setScheduledStart(Instant.parse("2026-04-15T14:00:00Z"));
        request.setScheduledEnd(Instant.parse("2026-04-15T22:00:00Z"));
        return request;
    }
}
