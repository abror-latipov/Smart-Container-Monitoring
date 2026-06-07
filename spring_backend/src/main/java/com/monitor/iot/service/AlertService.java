package com.monitor.iot.service;

import com.monitor.iot.model.Alert;
import com.monitor.iot.model.Container;
import com.monitor.iot.repository.AlertRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AlertService {
    private final AlertRepository alertRepository;
    private final ContainerService containerService;

    public AlertService(AlertRepository alertRepository, ContainerService containerService) {
        this.alertRepository = alertRepository;
        this.containerService = containerService;
    }

    public List<Alert> getAlertsForUser(String userId) {
        return alertRepository.findByUserId(userId);
    }

    public Alert resolveAlert(Long alertId, String userId) {
        Alert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new RuntimeException("Alert not found"));
        
        // Ownership validation: verify current user owns the container that generated this alert
        Container container = alert.getContainer();
        if (!container.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized to modify this alert");
        }
        
        alert.setResolved(true);
        return alertRepository.save(alert);
    }
}
