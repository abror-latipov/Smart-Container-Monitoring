package com.monitor.iot.service;

import com.monitor.iot.model.Container;
import com.monitor.iot.repository.ContainerRepository;
import com.monitor.iot.model.Destination;
import com.monitor.iot.repository.DestinationRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContainerService {
    private final ContainerRepository containerRepository;
    private final DestinationRepository destinationRepository;

    public ContainerService(ContainerRepository containerRepository, DestinationRepository destinationRepository) {
        this.containerRepository = containerRepository;
        this.destinationRepository = destinationRepository;
    }

    public List<Container> getAllContainers(String userId) {
        return containerRepository.findByUserId(userId);
    }

    public Container getContainerById(Long id, String userId) {
        Container container = containerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Container not found"));
        
        if (!container.getUserId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to container");
        }
        return container;
    }

    public Container createContainer(Container container, String userId) {
        if (containerRepository.findByName(container.getName()).isPresent()) {
            throw new RuntimeException("A device with this name already exists!");
        }
        container.setUserId(userId);
        container.setStatus(Container.Status.ACTIVE); // Starts as ACTIVE upon creation
        
        Container saved = containerRepository.save(container);
        
        // Save destination if provided
        if (container.getDestinationName() != null && !container.getDestinationName().trim().isEmpty() &&
            container.getTargetLatitude() != null && container.getTargetLongitude() != null) {
            
            Destination destination = Destination.builder()
                    .container(saved)
                    .locationName(container.getDestinationName())
                    .targetLatitude(container.getTargetLatitude())
                    .targetLongitude(container.getTargetLongitude())
                    .build();
            destinationRepository.save(destination);
        }
        
        return saved;
    }

    public Container activateContainer(Long id, String userId) {
        Container container = getContainerById(id, userId);
        container.setStatus(Container.Status.ACTIVE);
        return containerRepository.save(container);
    }

    public Container deactivateContainer(Long id, String userId) {
        Container container = getContainerById(id, userId);
        container.setStatus(Container.Status.INACTIVE);
        return containerRepository.save(container);
    }

    public Destination getDestinationByContainerId(Long containerId, String userId) {
        getContainerById(containerId, userId); // verifies container ownership
        List<Destination> destinations = destinationRepository.findByContainerId(containerId);
        return destinations.isEmpty() ? null : destinations.get(0);
    }

    public void deleteContainer(Long id, String userId) {
        Container container = getContainerById(id, userId); // This already checks ownership
        containerRepository.delete(container);
    }
}
