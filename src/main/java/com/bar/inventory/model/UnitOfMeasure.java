package com.bar.inventory.model;

import jakarta.validation.constraints.NotBlank;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

@Table("units_of_measure")
public class UnitOfMeasure {
    @Id
    @Column("unit_id")
    private Long id;

    @Column("unit_code")
    @NotBlank(message = "code es obligatorio")
    private String code;

    @Column("unit_name")
    @NotBlank(message = "name es obligatorio")
    private String name;

    @Column("unit_type")
    @NotBlank(message = "unitType es obligatorio")
    private String unitType;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUnitType() {
        return unitType;
    }

    public void setUnitType(String unitType) {
        this.unitType = unitType;
    }
}
