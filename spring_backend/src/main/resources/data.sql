-- Seed Containers
INSERT INTO containers (id, name, status, min_temp, max_temp, created_at, updated_at) VALUES (1, 'Container-001', 'ACTIVE', 5.0, 25.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO containers (id, name, status, min_temp, max_temp, created_at, updated_at) VALUES (2, 'Container-002', 'ACTIVE', 5.0, 25.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
INSERT INTO containers (id, name, status, min_temp, max_temp, created_at, updated_at) VALUES (3, 'Container-003', 'ACTIVE', 5.0, 25.0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed Telemetry
INSERT INTO telemetry (id, container_id, temperature, humidity, latitude, longitude, created_at) VALUES (1, 1, 22.5, 45.0, 41.35248, 69.22119, CURRENT_TIMESTAMP);
INSERT INTO telemetry (id, container_id, temperature, humidity, latitude, longitude, created_at) VALUES (2, 1, 23.0, 44.5, 41.35285, 69.22128, CURRENT_TIMESTAMP);
INSERT INTO telemetry (id, container_id, temperature, humidity, latitude, longitude, created_at) VALUES (3, 2, 18.2, 55.0, 40.7128, -74.0060, CURRENT_TIMESTAMP);
