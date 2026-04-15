package com.bar.inventory.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class AssignRolesRequest {
    @NotEmpty(message = "roleNames no puede estar vacio")
    private List<String> roleNames;

    public List<String> getRoleNames() {
        return roleNames;
    }

    public void setRoleNames(List<String> roleNames) {
        this.roleNames = roleNames;
    }
}
