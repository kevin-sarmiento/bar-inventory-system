package com.bar.inventory.service;

import com.bar.inventory.model.StockBalance;
import com.bar.inventory.repository.StockBalanceRepository;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Service
public class StockBalanceService {
    private final StockBalanceRepository repository;

    public StockBalanceService(StockBalanceRepository repository) {
        this.repository = repository;
    }

    public Flux<StockBalance> findAll() {
        return repository.findAll();
    }

    public Mono<StockBalance> findById(Long id) {
        return repository.findById(id);
    }
}
