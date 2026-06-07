package com.monitor.iot.model;

import jakarta.persistence.*;
import org.hibernate.annotations.Immutable;
import java.time.LocalDateTime;

@Entity
@Table(name = "telemetry")
public class Telemetry {

    @Id
    private Long id;

    @Column(name = "container_id", nullable = false)
    private Long containerId;

    @Column(name = "temperature")
    private Double temperature;

    @Column(name = "humidity")
    private Double humidity;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "battery_level")
    private Double batteryLevel;

    @Column(name = "vibration")
    private Double vibration;

    @Column(name = "vib_avg")
    private Double vibAvg;

    @Column(name = "speed")
    private Double speed;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public Telemetry() {}

    public Telemetry(Long id, Long containerId, Double temperature, Double humidity, Double latitude, Double longitude, Double batteryLevel, Double vibration, Double vibAvg, Double speed, LocalDateTime createdAt) {
        self(id, containerId, temperature, humidity, latitude, longitude, batteryLevel, vibration, vibAvg, speed, createdAt);
    }

    private void self(Long id, Long containerId, Double temperature, Double humidity, Double latitude, Double longitude, Double batteryLevel, Double vibration, Double vibAvg, Double speed, LocalDateTime createdAt) {
        this.id = id;
        this.containerId = containerId;
        this.temperature = temperature;
        this.humidity = humidity;
        this.latitude = latitude;
        this.longitude = longitude;
        this.batteryLevel = batteryLevel;
        this.vibration = vibration;
        this.vibAvg = vibAvg;
        this.speed = speed;
        this.createdAt = createdAt;
    }

    public Telemetry(Long id, Long containerId, Double temperature, Double humidity, Double latitude, Double longitude, Double batteryLevel, Double vibration, LocalDateTime createdAt) {
        self(id, containerId, temperature, humidity, latitude, longitude, batteryLevel, vibration, null, null, createdAt);
    }

    public static TelemetryBuilder builder() {
        return new TelemetryBuilder();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getContainerId() { return containerId; }
    public void setContainerId(Long containerId) { this.containerId = containerId; }
    public Double getTemperature() { return temperature; }
    public void setTemperature(Double temperature) { this.temperature = temperature; }
    public Double getHumidity() { return humidity; }
    public void setHumidity(Double humidity) { this.humidity = humidity; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public Double getBatteryLevel() { return batteryLevel; }
    public void setBatteryLevel(Double batteryLevel) { this.batteryLevel = batteryLevel; }
    public Double getVibration() { return vibration; }
    public void setVibration(Double vibration) { this.vibration = vibration; }
    public Double getVibAvg() { return vibAvg; }
    public void setVibAvg(Double vibAvg) { this.vibAvg = vibAvg; }
    public Double getSpeed() { return speed; }
    public void setSpeed(Double speed) { this.speed = speed; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public static class TelemetryBuilder {
        private Long id;
        private Long containerId;
        private Double temperature;
        private Double humidity;
        private Double latitude;
        private Double longitude;
        private Double batteryLevel;
        private Double vibration;
        private Double vibAvg;
        private Double speed;
        private LocalDateTime createdAt;

        public TelemetryBuilder id(Long id) { this.id = id; return this; }
        public TelemetryBuilder containerId(Long containerId) { this.containerId = containerId; return this; }
        public TelemetryBuilder temperature(Double temperature) { this.temperature = temperature; return this; }
        public TelemetryBuilder humidity(Double humidity) { this.humidity = humidity; return this; }
        public TelemetryBuilder latitude(Double latitude) { this.latitude = latitude; return this; }
        public TelemetryBuilder longitude(Double longitude) { this.longitude = longitude; return this; }
        public TelemetryBuilder batteryLevel(Double batteryLevel) { this.batteryLevel = batteryLevel; return this; }
        public TelemetryBuilder vibration(Double vibration) { this.vibration = vibration; return this; }
        public TelemetryBuilder vibAvg(Double vibAvg) { this.vibAvg = vibAvg; return this; }
        public TelemetryBuilder speed(Double speed) { this.speed = speed; return this; }
        public TelemetryBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Telemetry build() { return new Telemetry(id, containerId, temperature, humidity, latitude, longitude, batteryLevel, vibration, vibAvg, speed, createdAt); }
    }
}
