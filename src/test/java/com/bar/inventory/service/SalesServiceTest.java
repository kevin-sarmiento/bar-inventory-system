package com.bar.inventory.service;

import com.bar.inventory.dto.CreateSaleItemRequest;
import com.bar.inventory.dto.CreateSaleRequest;
import com.bar.inventory.model.Sale;
import com.bar.inventory.repository.SaleItemRepository;
import com.bar.inventory.repository.SaleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.r2dbc.core.DatabaseClient;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SalesServiceTest {

    @Mock
    private SaleRepository saleRepository;
    @Mock
    private SaleItemRepository saleItemRepository;
    @Mock
    private DatabaseClient databaseClient;

    @Test
    void createSaleShouldRejectItemWithMenuAndProductAtSameTime() {
        SalesService service = new SalesService(saleRepository, saleItemRepository, databaseClient);
        CreateSaleRequest request = validRequest();
        request.getItems().get(0).setProductId(1L);

        assertThrows(IllegalArgumentException.class, () -> service.createSale(request));
    }

    @Test
    void postToInventoryShouldFailWhenSaleAlreadyProcessed() {
        SalesService service = new SalesService(saleRepository, saleItemRepository, databaseClient);
        Sale sale = new Sale();
        sale.setId(10L);
        sale.setStatus("PAID");
        sale.setInventoryProcessed(true);
        when(saleRepository.findById(10L)).thenReturn(Mono.just(sale));

        StepVerifier.create(service.postToInventory(10L, 1L))
                .expectError(IllegalStateException.class)
                .verify();
    }

    private CreateSaleRequest validRequest() {
        CreateSaleItemRequest item = new CreateSaleItemRequest();
        item.setMenuItemId(1L);
        item.setQuantity(BigDecimal.ONE);
        item.setUnitPrice(BigDecimal.TEN);

        CreateSaleRequest request = new CreateSaleRequest();
        request.setSaleNumber("SALE-1");
        request.setSaleDatetime(Instant.now());
        request.setLocationId(1L);
        request.setTotalAmount(BigDecimal.TEN);
        request.setStatus("PAID");
        request.setItems(List.of(item));
        return request;
    }
}
