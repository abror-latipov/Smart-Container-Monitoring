package com.monitor.iot.service;

import com.monitor.iot.model.Container;
import com.monitor.iot.model.Telemetry;
import com.monitor.iot.model.Destination;
import com.monitor.iot.model.Alert;
import com.monitor.iot.repository.ContainerRepository;
import com.monitor.iot.repository.TelemetryRepository;
import com.monitor.iot.repository.DestinationRepository;
import com.monitor.iot.repository.AlertRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.Optional;

@Service
public class SimulationService {

    private final ContainerRepository containerRepository;
    private final TelemetryRepository telemetryRepository;
    private final DestinationRepository destinationRepository;
    private final AlertRepository alertRepository;
    private final Random random = new Random();

    public SimulationService(
            ContainerRepository containerRepository, 
            TelemetryRepository telemetryRepository,
            DestinationRepository destinationRepository,
            AlertRepository alertRepository) {
        this.containerRepository = containerRepository;
        this.telemetryRepository = telemetryRepository;
        this.destinationRepository = destinationRepository;
        this.alertRepository = alertRepository;
    }

    /*
    // Run every 10 seconds to generate data
    @Scheduled(fixedRate = 10000)
    public void simulateTelemetry() {
        // Only fetch and simulate containers that are ACTIVE
        List<Container> allContainers = containerRepository.findAll();
        
        for (Container container : allContainers) {
            if (container.getStatus() != Container.Status.ACTIVE) {
                continue;
            }

            double nextLat = 40.7128;
            double nextLng = -74.0060;
            boolean hasDestination = false;
            String destName = "";

            // Check if there is an active destination
            List<Destination> destinations = destinationRepository.findByContainerId(container.getId());
            if (!destinations.isEmpty()) {
                Destination destination = destinations.get(0);
                hasDestination = true;
                destName = destination.getLocationName();
                double targetLat = destination.getTargetLatitude();
                double targetLng = destination.getTargetLongitude();

                Optional<Telemetry> latestOpt = telemetryRepository.findFirstByContainerIdOrderByCreatedAtDesc(container.getId());
                if (latestOpt.isPresent()) {
                    double currentLat = latestOpt.get().getLatitude();
                    double currentLng = latestOpt.get().getLongitude();

                    // Calculate next position by interpolating (move 15% closer to target)
                    nextLat = currentLat + (targetLat - currentLat) * 0.15;
                    nextLng = currentLng + (targetLng - currentLng) * 0.15;

                    // Add small realistic GPS path noise/jitter
                    nextLat += (random.nextDouble() - 0.5) * 0.001;
                    nextLng += (random.nextDouble() - 0.5) * 0.001;

                    // Check if container has reached the destination (distance delta < 0.0015, approx 150 meters)
                    if (Math.abs(nextLat - targetLat) < 0.0015 && Math.abs(nextLng - targetLng) < 0.0015) {
                        nextLat = targetLat;
                        nextLng = targetLng;
                        
                        // Arrived! Automatically deactivate container
                        container.setStatus(Container.Status.INACTIVE);
                        containerRepository.save(container);

                        // Save an Arrival alert/notification (LOW severity)
                        Alert arrivalAlert = Alert.builder()
                                .container(container)
                                .message(String.format("Product arrived at destination: %s. Device successfully deactivated.", destName))
                                .severity(Alert.Severity.LOW)
                                .isResolved(false)
                                .latitude(nextLat)
                                .longitude(nextLng)
                                .createdAt(LocalDateTime.now())
                                .build();
                        alertRepository.save(arrivalAlert);
                    }
                } else {
                    // First telemetry: start close to target to make demo fast and fun (about 1.5 - 2 km away)
                    nextLat = targetLat - 0.015;
                    nextLng = targetLng - 0.015;
                }
            } else {
                // Default coordinates (New York area random walk)
                Optional<Telemetry> latestOpt = telemetryRepository.findFirstByContainerIdOrderByCreatedAtDesc(container.getId());
                if (latestOpt.isPresent()) {
                    nextLat = latestOpt.get().getLatitude() + (random.nextDouble() - 0.5) * 0.01;
                    nextLng = latestOpt.get().getLongitude() + (random.nextDouble() - 0.5) * 0.01;
                } else {
                    nextLat = 40.7128 + (random.nextDouble() - 0.5) * 0.05;
                    nextLng = -74.0060 + (random.nextDouble() - 0.5) * 0.05;
                }
            }

            // Simulate temperature based on limits
            double minT = container.getMinTemp() != null ? container.getMinTemp() : 5.0;
            double maxT = container.getMaxTemp() != null ? container.getMaxTemp() : 25.0;
            double midT = (minT + maxT) / 2.0;
            double range = maxT - minT;
            if (range <= 0) range = 20.0;

            // Generate temperature within safe range usually
            double temp = midT + (random.nextDouble() - 0.5) * (range * 0.8);

            // 15% chance to drift outside the safe temperature range for alert demonstration
            if (random.nextDouble() < 0.15) {
                if (random.nextBoolean()) {
                    temp = maxT + 1.0 + (random.nextDouble() * 3.0); // Spikes above max
                } else {
                    temp = minT - 1.0 - (random.nextDouble() * 3.0); // Drops below min
                }
            }

            // Check boundaries and trigger alert (only if there isn't already an unresolved temperature alert for this device)
            boolean hasUnresolvedAlert = alertRepository.findByContainerId(container.getId()).stream()
                    .anyMatch(a -> !a.isResolved() && a.getMessage().contains("Temperature"));

            if (!hasUnresolvedAlert) {
                if (temp > maxT) {
                    Alert alert = Alert.builder()
                            .container(container)
                            .message(String.format("Temperature high! Current: %.1f°C (Max limit: %.1f°C)", temp, maxT))
                            .severity(Alert.Severity.HIGH)
                            .isResolved(false)
                            .latitude(nextLat)
                            .longitude(nextLng)
                            .createdAt(LocalDateTime.now())
                            .build();
                    alertRepository.save(alert);
                } else if (temp < minT) {
                    Alert alert = Alert.builder()
                            .container(container)
                            .message(String.format("Temperature low! Current: %.1f°C (Min limit: %.1f°C)", temp, minT))
                            .severity(Alert.Severity.HIGH)
                            .isResolved(false)
                            .latitude(nextLat)
                            .longitude(nextLng)
                            .createdAt(LocalDateTime.now())
                            .build();
                    alertRepository.save(alert);
                }
            }

            // Simulate vibration and check for high-vibration locations
            double vibration = random.nextDouble() * 4.0; // 0-4.0 g
            boolean hasUnresolvedVibrationAlert = alertRepository.findByContainerId(container.getId()).stream()
                    .anyMatch(a -> !a.isResolved() && a.getMessage().contains("Vibration"));

            if (vibration > 3.0 && !hasUnresolvedVibrationAlert) {
                Alert vibrationAlert = Alert.builder()
                        .container(container)
                        .message(String.format("High Vibration alert! Current: %.1fG (Safe limit: 3.0G)", vibration))
                        .severity(Alert.Severity.HIGH)
                        .isResolved(false)
                        .latitude(nextLat)
                        .longitude(nextLng)
                        .createdAt(LocalDateTime.now())
                        .build();
                alertRepository.save(vibrationAlert);
            }

            // Build and save telemetry
            Telemetry telemetry = Telemetry.builder()
                    .id(System.currentTimeMillis() + random.nextInt(1000))
                    .containerId(container.getId())
                    .temperature(temp)
                    .humidity(40.0 + (random.nextDouble() * 30.0))    // 40-70%
                    .batteryLevel(Math.max(10.0, 95.0 - (random.nextDouble() * 0.5))) // battery depletes very slowly
                    .vibration(vibration)
                    .latitude(nextLat)
                    .longitude(nextLng)
                    .createdAt(LocalDateTime.now())
                    .build();
            
            telemetryRepository.save(telemetry);
        }
    }
    */
}
