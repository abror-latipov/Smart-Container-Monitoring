"""
End-to-end pipeline test for Smart Container backend.

Steps:
  1. Publish normal temperature, vibration, and location coordinates to container 001 MQTT topics.
  2. Wait a moment for backend (fastapi_backend) container to process.
  3. Query InsForge telemetry API to verify they are saved in database.
  4. Publish high temperature and severe vibration to trigger alerts.
  5. Wait a moment and check alerts API to verify alerts were successfully created.
"""

import json
import os
import time
import paho.mqtt.client as mqtt
import requests

# ── Config ──────────────────────────────────────────────────────────────────
MQTT_HOST = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_CONTAINER_ID = "001"
DB_CONTAINER_ID = 1

INSFORGE_URL = os.getenv("INSFORGE_URL", "https://your-app.region.insforge.app")
INSFORGE_ANON_KEY = os.getenv("INSFORGE_ANON_KEY", "")
HEADERS = {
    'apikey': INSFORGE_ANON_KEY,
    'Authorization': f'Bearer {INSFORGE_ANON_KEY}',
    'Prefer': 'return=representation'
}

# ── Helpers ──────────────────────────────────────────────────────────────────
def publish_to_topic(topic: str, payload: dict, label: str):
    """Publish a single JSON payload to the broker then disconnect."""

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            msg = json.dumps(payload)
            client.publish(topic, msg)
            print(f"  [OK] Published to {topic} [{label}]: {msg}")
        else:
            print(f"  [FAIL] MQTT connect failed, rc={rc}")

    def on_publish(client, userdata, mid):
        client.disconnect()

    try:
        c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
    except AttributeError:
        c = mqtt.Client()

    c.on_connect = on_connect
    c.on_publish = on_publish

    try:
        c.connect(MQTT_HOST, MQTT_PORT, 60)
        c.loop_forever()
    except Exception as e:
        print(f"  [FAIL] Cannot reach MQTT broker at {MQTT_HOST}:{MQTT_PORT}")
        print(f"         Error: {e}")

def check_db_table(table: str, query_params: str):
    """Query a table directly in InsForge database and print results."""
    url = f"{INSFORGE_URL}/api/database/records/{table}?{query_params}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=5)
        print(f"  GET {url}  ->  HTTP {r.status_code}")
        body = r.json()
        print(f"  Total records: {len(body)}")
        if body:
            print(f"  Latest record:\n{json.dumps(body[0], indent=4, default=str)}")
    except Exception as e:
        print(f"  [FAIL] Unexpected error: {e}")

# ── Main ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    SEP = "=" * 60

    print(f"\n{SEP}")
    print("  SMART CONTAINER -- Pipeline Test")
    print(SEP)

    print(f"\n[STEP 1] Publishing NORMAL sensor data for Container {MQTT_CONTAINER_ID} ...")
    publish_to_topic(
        f"bunker/{MQTT_CONTAINER_ID}/temperature",
        {"hum": 39.4, "temp": 25.8, "timestamp": "16/05/2026 08:54:19"},
        "NORMAL_TEMP"
    )
    publish_to_topic(
        f"bunker/{MQTT_CONTAINER_ID}/location",
        {"lat": 41.405209, "lng": 69.3168285, "timestamp": "16/05/2026 08:54:07"},
        "NORMAL_LOCATION"
    )
    publish_to_topic(
        f"bunker/{MQTT_CONTAINER_ID}/vibration",
        {
            "lat": 41.405209,
            "lng": 69.3168285,
            "speed": 0.05556,
            "timestamp": "16/05/2026 08:54:07",
            "unit": "g",
            "vib_avg": 0.535141121,
            "vib_peak": 3.664397027
        },
        "NORMAL_VIB"
    )

    print("\n[STEP 2] Waiting 3 s for backend to process and write ...")
    time.sleep(3)

    print(f"\n[STEP 3] Verifying telemetry in PostgreSQL for Container {DB_CONTAINER_ID} ...")
    check_db_table("telemetry", f"container_id=eq.{DB_CONTAINER_ID}&order=id.desc&limit=3")

    print(f"\n[STEP 4] Publishing ALERT payloads for Container {MQTT_CONTAINER_ID} (temp=35.8, vib=10.1) ...")
    publish_to_topic(
        f"bunker/{MQTT_CONTAINER_ID}/temperature",
        {"hum": 39.4, "temp": 35.8, "timestamp": "16/05/2026 09:04:31"},
        "HIGH_TEMP_ALERT"
    )
    publish_to_topic(
        f"bunker/{MQTT_CONTAINER_ID}/vibration",
        {
            "lat": 41.40521717,
            "lng": 69.316873,
            "speed": 0.16668,
            "timestamp": "16/05/2026 09:09:50",
            "unit": "g",
            "vib_avg": 0.806008299,
            "vib_peak": 10.10795461
        },
        "HIGH_VIB_ALERT"
    )

    print("\n[STEP 5] Waiting 3 s then verifying triggered alerts in PostgreSQL ...")
    time.sleep(3)
    check_db_table("alerts", f"container_id=eq.{DB_CONTAINER_ID}&order=id.desc&limit=3")

    print(f"\n{SEP}")
    print("  Test complete!")
    print(f"{SEP}\n")
