package com.monitor.iot.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "containers")
public class Container {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @Column(name = "min_temp")
    private Double minTemp;

    @Column(name = "max_temp")
    private Double maxTemp;

    @Column(name = "max_vibration")
    private Double maxVibration;

    @Transient
    private String destinationName;

    @Transient
    private Double targetLatitude;

    @Transient
    private Double targetLongitude;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Container() {}

    public Container(Long id, String name, Status status, Double minTemp, Double maxTemp, Double maxVibration, String userId, LocalDateTime createdAt, LocalDateTime updatedAt) {
        self(id, name, status, minTemp, maxTemp, maxVibration, userId, createdAt, updatedAt);
    }

    private void self(Long id, String name, Status status, Double minTemp, Double maxTemp, Double maxVibration, String userId, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.minTemp = minTemp;
        this.maxTemp = maxTemp;
        this.maxVibration = maxVibration;
        this.userId = userId;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public Container(Long id, String name, Status status, Double minTemp, Double maxTemp, String userId, LocalDateTime createdAt, LocalDateTime updatedAt) {
        self(id, name, status, minTemp, maxTemp, null, userId, createdAt, updatedAt);
    }

    public static ContainerBuilder builder() {
        return new ContainerBuilder();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Double getMinTemp() { return minTemp; }
    public void setMinTemp(Double minTemp) { this.minTemp = minTemp; }
    public Double getMaxTemp() { return maxTemp; }
    public void setMaxTemp(Double maxTemp) { this.maxTemp = maxTemp; }
    public Double getMaxVibration() { return maxVibration; }
    public void setMaxVibration(Double maxVibration) { this.maxVibration = maxVibration; }
    
    public String getDestinationName() { return destinationName; }
    public void setDestinationName(String destinationName) { this.destinationName = destinationName; }
    public Double getTargetLatitude() { return targetLatitude; }
    public void setTargetLatitude(Double targetLatitude) { this.targetLatitude = targetLatitude; }
    public Double getTargetLongitude() { return targetLongitude; }
    public void setTargetLongitude(Double targetLongitude) { this.targetLongitude = targetLongitude; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum Status {
        ACTIVE, INACTIVE, MAINTENANCE
    }

    public static class ContainerBuilder {
        private Long id;
        private String name;
        private Status status;
        private Double minTemp;
        private Double maxTemp;
        private Double maxVibration;
        private String userId;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public ContainerBuilder id(Long id) { this.id = id; return this; }
        public ContainerBuilder name(String name) { this.name = name; return this; }
        public ContainerBuilder status(Status status) { this.status = status; return this; }
        public ContainerBuilder minTemp(Double minTemp) { this.minTemp = minTemp; return this; }
        public ContainerBuilder maxTemp(Double maxTemp) { this.maxTemp = maxTemp; return this; }
        public ContainerBuilder maxVibration(Double maxVibration) { this.maxVibration = maxVibration; return this; }
        public ContainerBuilder userId(String userId) { this.userId = userId; return this; }
        public ContainerBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public ContainerBuilder updatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; return this; }
        public Container build() { return new Container(id, name, status, minTemp, maxTemp, maxVibration, userId, createdAt, updatedAt); }
    }
}
