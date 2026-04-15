package com.bar.inventory.service;

import com.bar.inventory.dto.CreatePhysicalCountItemRequest;
import com.bar.inventory.dto.CreatePhysicalCountRequest;
import com.bar.inventory.model.PhysicalCount;
import com.bar.inventory.repository.PhysicalCountItemRepository;
import com.bar.inventory.repository.PhysicalCountRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.r2dbc.core.DatabaseClient;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PhysicalCountServiceTest {

    @Mock
    private PhysicalCountRepository physicalCountRepository;
    @Mock
    private PhysicalCountItemRepository physicalCountItemRepository;
    @Mock
    private DatabaseClient databaseClient;

    @Test
    void createCountShouldRejectDuplicatedProductIds() {
        PhysicalCountService service = new PhysicalCountService(physicalCountRepository, physicalCountItemRepository, databaseClient);
        CreatePhysicalCountRequest request = validRequestWithDuplicateProducts();

        assertThrows(IllegalArgumentException.class, () -> service.createCount(request));
    }

    @Test
    void closeCountShouldRejectInvalidUser() {
        PhysicalCountService service = new PhysicalCountService(physicalCountRepository, physicalCountItemRepository, databaseClient);

        StepVerifier.create(service.closeCount(1L, 0L))
                .expectError(IllegalArgumentException.class)
                .verify();
    }

    @Test
    void closeCountShouldRejectWhenCountIsNotDraft() {
        PhysicalCountService service = new PhysicalCountService(physicalCountRepository, physicalCountItemRepository, databaseClient);
        PhysicalCount count = new PhysicalCount();
        count.setId(1L);
        count.setStatus("CLOSED");
        when(physicalCountRepository.findById(1L)).thenReturn(reactor.core.publisher.Mono.just(count));

        StepVerifier.create(service.closeCount(1L, 1L))
                .expectError(IllegalStateException.class)
                .verify();
    }

    @Test
    void createCountShouldRejectMissingCountNumber() {
        PhysicalCountService service = new PhysicalCountService(physicalCountRepository, physicalCountItemRepository, databaseClient);
        CreatePhysicalCountRequest request = validRequestWithDuplicateProducts();
        request.setItems(List.of(request.getItems().get(0)));
        request.setCountNumber(" ");

        assertThrows(IllegalArgumentException.class, () -> service.createCount(request));
    }

    private CreatePhysicalCountRequest validRequestWithDuplicateProducts() {
        CreatePhysicalCountItemRequest item1 = new CreatePhysicalCountItemRequest();
        item1.setProductId(1L);
        item1.setTheoreticalQtyBase(BigDecimal.ONE);
        item1.setActualQtyBase(BigDecimal.ONE);

        CreatePhysicalCountItemRequest item2 = new CreatePhysicalCountItemRequest();
        item2.setProductId(1L);
        item2.setTheoreticalQtyBase(BigDecimal.ONE);
        item2.setActualQtyBase(BigDecimal.ONE);

        CreatePhysicalCountRequest request = new CreatePhysicalCountRequest();
        request.setCountNumber("CNT-1");
        request.setLocationId(1L);
        request.setCountDate(Instant.now());
        request.setItems(List.of(item1, item2));
        return request;
    }
}
