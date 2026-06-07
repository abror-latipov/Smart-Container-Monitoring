package com.monitor.iot.repository;

import com.monitor.iot.model.Telemetry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TelemetryRepository extends JpaRepository<Telemetry, Long> {
    List<Telemetry> findByContainerIdOrderByCreatedAtDesc(Long containerId);
    Optional<Telemetry> findFirstByContainerIdOrderByCreatedAtDesc(Long containerId);
}
