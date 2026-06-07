package com.monitor.iot.controller;

import com.monitor.iot.model.Telemetry;
import com.monitor.iot.service.TelemetryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/telemetry")
public class TelemetryController {

    private final TelemetryService telemetryService;

    public TelemetryController(TelemetryService telemetryService) {
        this.telemetryService = telemetryService;
    }

    @GetMapping("/container/{id}/latest")
    public ResponseEntity<Telemetry> getLatestTelemetry(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Telemetry telemetry = telemetryService.getLatestTelemetry(id, userId);
        if (telemetry == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(telemetry);
    }

    @GetMapping("/container/{id}/history")
    public ResponseEntity<List<Telemetry>> getTelemetryHistory(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(telemetryService.getTelemetryHistory(id, userId));
    }
}
