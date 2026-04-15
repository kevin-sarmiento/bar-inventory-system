package com.bar.inventory.service;

import com.bar.inventory.dto.CreateTransactionItemRequest;
import com.bar.inventory.dto.CreateTransactionRequest;
import com.bar.inventory.repository.InventoryTransactionItemRepository;
import com.bar.inventory.repository.InventoryTransactionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;

@ExtendWith(MockitoExtension.class)
class InventoryTransactionServiceTest {

    @Mock
    private InventoryTransactionRepository repository;
    @Mock
    private InventoryTransactionItemRepository itemRepository;

    @Test
    void createWithItemsShouldRejectTransferWithoutBothLocations() {
        InventoryTransactionService service = new InventoryTransactionService(repository, itemRepository);
        CreateTransactionRequest request = validRequest();
        request.setTransactionType("TRANSFER");
        request.setSourceLocationId(1L);
        request.setTargetLocationId(null);

        assertThrows(IllegalArgumentException.class, () -> service.createWithItems(request));
    }

    @Test
    void createWithItemsShouldRejectInvalidStatus() {
        InventoryTransactionService service = new InventoryTransactionService(repository, itemRepository);
        CreateTransactionRequest request = validRequest();
        request.setStatus("INVALID");

        assertThrows(IllegalArgumentException.class, () -> service.createWithItems(request));
    }

    private CreateTransactionRequest validRequest() {
        CreateTransactionItemRequest item = new CreateTransactionItemRequest();
        item.setProductId(1L);
        item.setUnitId(1L);
        item.setQuantity(BigDecimal.ONE);
        item.setUnitCost(BigDecimal.ONE);

        CreateTransactionRequest request = new CreateTransactionRequest();
        request.setTransactionNumber("TX-1");
        request.setTransactionType("PURCHASE");
        request.setTransactionDate(Instant.now());
        request.setTargetLocationId(1L);
        request.setSupplierId(1L);
        request.setStatus("POSTED");
        request.setItems(List.of(item));
        return request;
    }
}
