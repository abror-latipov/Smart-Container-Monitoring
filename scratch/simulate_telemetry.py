import json
import os
import time
import paho.mqtt.client as mqtt
import psycopg2

MQTT_HOST = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
CONTAINER_ID = 20

# First, connect to Postgres and send the schema reload notify
conn_str = os.getenv("INSFORGE_DATABASE_URL", "")
if not conn_str:
    raise SystemExit("Set INSFORGE_DATABASE_URL before running this script.")
try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    print("Sending reload schema notifications...")
    cur.execute("NOTIFY pgrst, 'reload schema';")
    cur.execute("NOTIFY pgrst, 'reload config';")
    conn.commit()
    cur.close()
    conn.close()
    print("Schema reload notification sent. Waiting 2 seconds...")
    time.sleep(2)
except Exception as e:
    print("Failed to notify schema reload:", e)

def publish_mqtt(topic, payload):
    client = mqtt.Client()
    try:
        client.connect(MQTT_HOST, MQTT_PORT, 60)
        client.publish(topic, json.dumps(payload))
        client.disconnect()
        print(f"Published to {topic}: {payload}")
    except Exception as e:
        print(f"Failed to publish to MQTT: {e}")

# 1. Publish vibration payload with lat, lng, speed, vib_avg, vib_peak
vib_payload = {
    "lat": 41.405208,
    "lng": 69.316828,
    "speed": 12.5,
    "timestamp": "20/05/2026 23:10:00",
    "unit": "g",
    "vib_avg": 0.45,
    "vib_peak": 1.85
}
publish_mqtt(f"bunker/{CONTAINER_ID}/vibration", vib_payload)

# 2. Publish temperature payload
temp_payload = {
    "hum": 42.1,
    "temp": 18.5,
    "timestamp": "20/05/2026 23:10:15"
}
publish_mqtt(f"bunker/{CONTAINER_ID}/temperature", temp_payload)

print("Waiting 3 seconds for backend to process...")
time.sleep(3)

# 3. Query the database to verify speed and vib_avg were saved
try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    cur.execute("SELECT id, container_id, temperature, humidity, speed, vibration, vib_avg, latitude, longitude, created_at FROM telemetry WHERE container_id = %s ORDER BY id DESC LIMIT 2;", (CONTAINER_ID,))
    records = cur.fetchall()
    
    print("\n--- Recent DB Telemetry Records ---")
    for r in records:
        print(f"ID: {r[0]} | Container: {r[1]} | Temp: {r[2]}°C | Hum: {r[3]}% | Speed: {r[4]} m/s | Vib Peak: {r[5]}g | Vib Avg: {r[6]}g | Lat: {r[7]} | Lng: {r[8]} | Created: {r[9]}")
        
    cur.close()
    conn.close()
except Exception as e:
    print("Database verification error:", e)
