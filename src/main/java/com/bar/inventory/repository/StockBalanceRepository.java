package com.bar.inventory.repository;

import com.bar.inventory.model.StockBalance;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface StockBalanceRepository extends R2dbcRepository<StockBalance, Long> {
}
