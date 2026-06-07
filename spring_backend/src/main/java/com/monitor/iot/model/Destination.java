package com.monitor.iot.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "destinations")
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "container_id", nullable = false)
    private Container container;

    @Column(name = "location_name", nullable = false)
    private String locationName;

    @Column(name = "target_latitude", nullable = false)
    private Double targetLatitude;

    @Column(name = "target_longitude", nullable = false)
    private Double targetLongitude;

    @Column(name = "eta")
    private LocalDateTime eta;

    public Destination() {}

    public Destination(Long id, Container container, String locationName, Double targetLatitude, Double targetLongitude, LocalDateTime eta) {
        this.id = id;
        this.container = container;
        this.locationName = locationName;
        this.targetLatitude = targetLatitude;
        this.targetLongitude = targetLongitude;
        this.eta = eta;
    }

    public static DestinationBuilder builder() {
        return new DestinationBuilder();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Container getContainer() { return container; }
    public void setContainer(Container container) { this.container = container; }
    public String getLocationName() { return locationName; }
    public void setLocationName(String locationName) { this.locationName = locationName; }
    public Double getTargetLatitude() { return targetLatitude; }
    public void setTargetLatitude(Double targetLatitude) { this.targetLatitude = targetLatitude; }
    public Double getTargetLongitude() { return targetLongitude; }
    public void setTargetLongitude(Double targetLongitude) { this.targetLongitude = targetLongitude; }
    public LocalDateTime getEta() { return eta; }
    public void setEta(LocalDateTime eta) { this.eta = eta; }

    public static class DestinationBuilder {
        private Long id;
        private Container container;
        private String locationName;
        private Double targetLatitude;
        private Double targetLongitude;
        private LocalDateTime eta;

        public DestinationBuilder id(Long id) { this.id = id; return this; }
        public DestinationBuilder container(Container container) { this.container = container; return this; }
        public DestinationBuilder locationName(String locationName) { this.locationName = locationName; return this; }
        public DestinationBuilder targetLatitude(Double targetLatitude) { this.targetLatitude = targetLatitude; return this; }
        public DestinationBuilder targetLongitude(Double targetLongitude) { this.targetLongitude = targetLongitude; return this; }
        public DestinationBuilder eta(LocalDateTime eta) { this.eta = eta; return this; }
        public Destination build() { return new Destination(id, container, locationName, targetLatitude, targetLongitude, eta); }
    }
}
