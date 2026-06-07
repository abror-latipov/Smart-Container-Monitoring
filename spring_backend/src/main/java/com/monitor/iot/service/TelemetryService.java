package com.monitor.iot.service;

import com.monitor.iot.model.Telemetry;
import com.monitor.iot.repository.TelemetryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TelemetryService {
    private final TelemetryRepository telemetryRepository;
    private final ContainerService containerService;

    public TelemetryService(TelemetryRepository telemetryRepository, ContainerService containerService) {
        this.telemetryRepository = telemetryRepository;
        this.containerService = containerService;
    }

    public Telemetry getLatestTelemetry(Long containerId, String userId) {
        // Validate container ownership
        containerService.getContainerById(containerId, userId);
        
        return telemetryRepository.findFirstByContainerIdOrderByCreatedAtDesc(containerId)
                .orElse(null);
    }

    public List<Telemetry> getTelemetryHistory(Long containerId, String userId) {
        // Validate container ownership
        containerService.getContainerById(containerId, userId);
        
        return telemetryRepository.findByContainerIdOrderByCreatedAtDesc(containerId);
    }
}
