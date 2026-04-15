package com.bar.inventory.repository;

import com.bar.inventory.model.Role;
import org.springframework.data.r2dbc.repository.R2dbcRepository;

public interface RoleRepository extends R2dbcRepository<Role, Long> {
}
