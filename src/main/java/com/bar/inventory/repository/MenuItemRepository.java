package com.bar.inventory.repository;

import com.bar.inventory.model.MenuItem;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface MenuItemRepository extends R2dbcRepository<MenuItem, Long> {
}
