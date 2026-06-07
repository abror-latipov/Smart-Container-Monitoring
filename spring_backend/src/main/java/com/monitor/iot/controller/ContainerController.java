package com.monitor.iot.controller;

import com.monitor.iot.model.Container;
import com.monitor.iot.model.Destination;
import com.monitor.iot.service.ContainerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/containers")
public class ContainerController {

    private final ContainerService containerService;

    public ContainerController(ContainerService containerService) {
        this.containerService = containerService;
    }

    @GetMapping
    public ResponseEntity<List<Container>> getAllContainers() {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(containerService.getAllContainers(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Container> getContainerById(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(containerService.getContainerById(id, userId));
    }

    @GetMapping("/{id}/destination")
    public ResponseEntity<Destination> getDestination(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Destination dest = containerService.getDestinationByContainerId(id, userId);
        if (dest == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(dest);
    }

    @PostMapping
    public ResponseEntity<Container> createContainer(@RequestBody Container container) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(containerService.createContainer(container, userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContainer(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        containerService.deleteContainer(id, userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/activate")
    public ResponseEntity<Container> activateContainer(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(containerService.activateContainer(id, userId));
    }

    @PostMapping("/{id}/deactivate")
    public ResponseEntity<Container> deactivateContainer(@PathVariable Long id) {
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return ResponseEntity.ok(containerService.deactivateContainer(id, userId));
    }
}
