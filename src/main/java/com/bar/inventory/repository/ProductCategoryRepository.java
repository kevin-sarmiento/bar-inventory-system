package com.bar.inventory.repository;

import com.bar.inventory.model.ProductCategory;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface ProductCategoryRepository extends R2dbcRepository<ProductCategory, Long> {
}
