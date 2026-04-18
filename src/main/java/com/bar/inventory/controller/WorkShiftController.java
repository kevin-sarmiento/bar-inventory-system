package com.bar.inventory.controller;

import com.bar.inventory.dto.CreateShiftRequest;
import com.bar.inventory.dto.ShiftDto;
import com.bar.inventory.service.WorkShiftService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(path = "/api/shifts", produces = MediaType.APPLICATION_JSON_VALUE)
public class WorkShiftController {
    private final WorkShiftService workShiftService;

    public WorkShiftController(WorkShiftService workShiftService) {
        this.workShiftService = workShiftService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Flux<ShiftDto> findAll() {
        return workShiftService.findAll();
    }

    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public Flux<ShiftDto> findMine() {
        return workShiftService.findMyShifts();
    }

    @GetMapping("/for-sale")
    @PreAuthorize("isAuthenticated()")
    public Flux<ShiftDto> forSale(@RequestParam("locationId") Long locationId) {
        return workShiftService.findShiftsEligibleForSale(locationId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public Mono<ShiftDto> findById(@PathVariable("id") Long id) {
        return workShiftService.findById(id);
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ShiftDto> create(@Valid @RequestBody CreateShiftRequest request) {
        return workShiftService.create(request);
    }

    @PutMapping(path = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ShiftDto> update(@PathVariable("id") Long id,
                                 @Valid @RequestBody CreateShiftRequest request) {
        return workShiftService.update(id, request);
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('ADMINISTRADOR','GERENTE')")
    public Mono<ShiftDto> cancel(@PathVariable("id") Long id) {
        return workShiftService.cancel(id);
    }

    @PostMapping("/{id}/check-in")
    @PreAuthorize("isAuthenticated()")
    public Mono<ShiftDto> checkIn(@PathVariable("id") Long id) {
        return workShiftService.checkIn(id);
    }

    @PostMapping("/{id}/check-out")
    @PreAuthorize("isAuthenticated()")
    public Mono<ShiftDto> checkOut(@PathVariable("id") Long id) {
        return workShiftService.checkOut(id);
    }
}
