package com.monitor.iot.repository;

import com.monitor.iot.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByContainerId(Long containerId);
    List<Alert> findByIsResolvedFalse();

    @Query("SELECT a FROM Alert a WHERE a.container.userId = :userId ORDER BY a.createdAt DESC")
    List<Alert> findByUserId(@Param("userId") String userId);
}
