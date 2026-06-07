package com.monitor.iot.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "alerts")
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @Column(nullable = false)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Severity severity;

    @Column(name = "is_resolved")
    private boolean isResolved = false;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Alert() {}

    public Alert(Long id, Container container, String message, Severity severity, boolean isResolved, Double latitude, Double longitude, LocalDateTime createdAt) {
        this.id = id;
        this.container = container;
        this.message = message;
        this.severity = severity;
        this.isResolved = isResolved;
        this.latitude = latitude;
        this.longitude = longitude;
        this.createdAt = createdAt;
    }

    public static AlertBuilder builder() {
        return new AlertBuilder();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Container getContainer() { return container; }
    public void setContainer(Container container) { this.container = container; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    public boolean isResolved() { return isResolved; }
    public void setResolved(boolean resolved) { isResolved = resolved; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public enum Severity {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    public static class AlertBuilder {
        private Long id;
        private Container container;
        private String message;
        private Severity severity;
        private boolean isResolved = false;
        private Double latitude;
        private Double longitude;
        private LocalDateTime createdAt;

        public AlertBuilder id(Long id) { this.id = id; return this; }
        public AlertBuilder container(Container container) { this.container = container; return this; }
        public AlertBuilder message(String message) { this.message = message; return this; }
        public AlertBuilder severity(Severity severity) { this.severity = severity; return this; }
        public AlertBuilder isResolved(boolean isResolved) { this.isResolved = isResolved; return this; }
        public AlertBuilder latitude(Double latitude) { this.latitude = latitude; return this; }
        public AlertBuilder longitude(Double longitude) { this.longitude = longitude; return this; }
        public AlertBuilder createdAt(LocalDateTime createdAt) { this.createdAt = createdAt; return this; }
        public Alert build() { return new Alert(id, container, message, severity, isResolved, latitude, longitude, createdAt); }
    }
}
