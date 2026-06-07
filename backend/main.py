import json
import os
import requests
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from paho.mqtt import client as mqtt
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INSFORGE_URL = os.getenv("INSFORGE_URL", "https://your-app.region.insforge.app")
INSFORGE_ANON_KEY = os.getenv("INSFORGE_ANON_KEY", "")
MQTT_BROKER = os.getenv("MQTT_BROKER", "mosquitto")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_CONTAINER_MAP = os.getenv("MQTT_CONTAINER_MAP", "")

# InsForge Headers
HEADERS = {
    "apikey": INSFORGE_ANON_KEY,
    "Authorization": f"Bearer {INSFORGE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

# State for cooldowns
last_vib_alert = {}
VIB_COOLDOWN_SECONDS = 300  # 5 minutes
_last_id = 0

def load_container_map():
    db_to_mqtt = {}
    mqtt_to_db = {}
    for pair in MQTT_CONTAINER_MAP.split(","):
        if ":" not in pair:
            continue
        db_id, mqtt_id = pair.split(":", 1)
        try:
            normalized_db_id = str(int(db_id.strip()))
        except ValueError:
            continue
        normalized_mqtt_id = mqtt_id.strip()
        if not normalized_mqtt_id:
            continue
        db_to_mqtt[normalized_db_id] = normalized_mqtt_id
        mqtt_to_db[normalized_mqtt_id] = normalized_db_id
    return db_to_mqtt, mqtt_to_db

DB_TO_MQTT_CONTAINER_ID, MQTT_TO_DB_CONTAINER_ID = load_container_map()

def normalize_container_id(container_id: str) -> str:
    return str(int(container_id))

def db_container_id_from_mqtt(container_id: str) -> str:
    return MQTT_TO_DB_CONTAINER_ID.get(container_id, normalize_container_id(container_id))

def mqtt_container_id(container_id: str) -> str:
    normalized_container_id = normalize_container_id(container_id)
    return DB_TO_MQTT_CONTAINER_ID.get(normalized_container_id, normalized_container_id.zfill(3))

def generate_unique_id():
    global _last_id
    new_id = int(time.time() * 1000)
    if new_id <= _last_id:
        new_id = _last_id + 1
    _last_id = new_id
    return new_id

def save_to_insforge(table: str, data: dict):
    url = f"{INSFORGE_URL}/api/database/records/{table}"
    print(f"[BACKEND] Saving to table '{table}' via PostgREST: {data}")
    try:
        response = requests.post(url, headers=HEADERS, json=[data])
        print(f"[BACKEND] InsForge response: HTTP {response.status_code}")
        if response.status_code not in [200, 201, 204]:
            print(f"InsForge insert error ({table}): {response.text}")
    except Exception as e:
        print(f"InsForge connection error: {e}")

def trigger_alert(container_id: str, severity: str, message: str, lat: float = None, lng: float = None):
    normalized_container_id = normalize_container_id(container_id)
    # Save the alert to the database so the Telegram bot (running separately) can pick it up
    alert_data = {
        "id": generate_unique_id(),
        "container_id": int(normalized_container_id),
        "severity": severity,
        "message": message,
        "is_resolved": False
    }
    if lat is not None:
        alert_data["latitude"] = lat
    if lng is not None:
        alert_data["longitude"] = lng
    save_to_insforge("alerts", alert_data)

# container_id -> {"minTemp": 5, "maxTemp": 25, "maxVibration": 2.0}
container_limits_cache = {}

class ContainerSettings(BaseModel):
    minTemp: float
    maxTemp: float
    maxVibration: float
    turnOn: bool = True

@app.put("/api/containers/{container_id}/settings")
def update_container_settings(container_id: str, settings: ContainerSettings):
    normalized_container_id = normalize_container_id(container_id)
    topic_container_id = mqtt_container_id(container_id)

    container_limits_cache[normalized_container_id] = {
        "minTemp": settings.minTemp,
        "maxTemp": settings.maxTemp,
        "maxVibration": settings.maxVibration
    }
    
    # Update DB via PostgREST
    url = f"{INSFORGE_URL}/api/database/records/containers?id=eq.{normalized_container_id}"
    update_data = {
        "min_temp": settings.minTemp,
        "max_temp": settings.maxTemp,
        "max_vibration": settings.maxVibration
    }
    try:
        requests.patch(url, headers=HEADERS, json=update_data)
    except Exception as e:
        print(f"Failed to update container settings in DB: {e}")

    # Publish only hardware temperature/fan settings to the ESP32.
    # Vibration remains an application alert threshold for dashboard/Telegram.
    temp_payload = {
        "maxTemp": settings.maxTemp,
        "minTemp": settings.minTemp,
        "turnOn": settings.turnOn
    }
    mqtt_client.publish(f"bunker/{topic_container_id}/setTemp", json.dumps(temp_payload))
    
    # Separate vibration topic for backward compatibility – use the same key name expected by front‑end
    return {
        "status": "success",
        "message": "Settings updated and published",
        "container_id": int(normalized_container_id),
        "mqtt_container_id": topic_container_id
    }

last_gps = {}  # container_id -> (lat, lng)

def on_message(client, userdata, msg):
    global last_gps
    try:
        topic_parts = msg.topic.split('/')
        print(f"[BACKEND] Received MQTT topic: {msg.topic} - payload: {msg.payload.decode()}")
        if len(topic_parts) >= 3:
            container_id = db_container_id_from_mqtt(topic_parts[1])
            topic_container_id = mqtt_container_id(container_id)
            data_type = topic_parts[2]
            
            # Guard against control/setting topics (like setTemp, setVib, commands)
            if data_type not in ["temperature", "vibration", "gps", "location", "battery"]:
                return
            
            payload = json.loads(msg.payload.decode())
            timestamp = payload.get("timestamp", "")
            if timestamp:
                try:
                    from datetime import datetime
                    dt = datetime.strptime(timestamp, "%d/%m/%Y %H:%M:%S")
                    timestamp = dt.isoformat()
                except Exception:
                    pass
            if not timestamp:
                from datetime import datetime, timezone
                timestamp = datetime.now(timezone.utc).isoformat()
            
            # Save telemetry to DB with correct columns
            telemetry_data = {
                "id": generate_unique_id(),
                "container_id": int(container_id),
                "created_at": timestamp
            }
                
            if data_type == "temperature":
                telemetry_data["temperature"] = float(payload.get("temp", 0))
                telemetry_data["humidity"] = float(payload.get("hum", 0))
            elif data_type == "vibration":
                telemetry_data["vibration"] = float(payload.get("vib_peak", 0))
                telemetry_data["vib_avg"] = float(payload.get("vib_avg", 0))
                telemetry_data["speed"] = float(payload.get("speed", 0))
                if "lat" in payload and "lng" in payload:
                    telemetry_data["latitude"] = float(payload.get("lat", 0))
                    telemetry_data["longitude"] = float(payload.get("lng", 0))
                    last_gps[container_id] = (telemetry_data["latitude"], telemetry_data["longitude"])
            elif data_type in ["gps", "location"]:
                telemetry_data["latitude"] = float(payload.get("lat", 0))
                telemetry_data["longitude"] = float(payload.get("lng", 0))
                last_gps[container_id] = (telemetry_data["latitude"], telemetry_data["longitude"])
            elif data_type == "battery":
                telemetry_data["battery_level"] = float(payload.get("battery_level", payload.get("battery", 0)))
            
            save_to_insforge("telemetry", telemetry_data)
            
            # Alerts logic - Delegated to DB for the separate Telegram Bot to read
            if data_type == "temperature":
                temp = payload.get("temp", 0)
                limits = container_limits_cache.get(container_id, {"maxTemp": 30.0, "minTemp": 0.0})
                if temp > limits["maxTemp"]:
                    trigger_alert(container_id, "HIGH", f"High temperature detected: {temp}°C")
                    client.publish(f"bunker/{topic_container_id}/setTemp", json.dumps({
                        "maxTemp": limits["maxTemp"],
                        "minTemp": limits["minTemp"],
                        "turnOn": True
                    }))
                    
            if data_type == "vibration":
                vib = payload.get("vib_peak", 0)
                limits = container_limits_cache.get(container_id, {"maxVibration": 1.0})
                if vib > limits["maxVibration"]:
                    current_time = time.time()
                    last_alert_time = last_vib_alert.get(container_id, 0)
                    
                    if (current_time - last_alert_time) > VIB_COOLDOWN_SECONDS:
                        lat, lng = last_gps.get(container_id, (None, None))
                        trigger_alert(container_id, "CRITICAL", f"Harsh vibration detected: {vib}g", lat, lng)
                        last_vib_alert[container_id] = current_time

    except Exception as e:
        print(f"MQTT process error: {e}")

def on_connect(c, u, f, rc):
    print(f"[BACKEND] MQTT Client connected with result code {rc}")
    c.subscribe("bunker/+/+")

mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_connect
mqtt_client.on_message = on_message

try:
    mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
    mqtt_client.loop_start()
except Exception as e:
    print(f"MQTT connection failed: {e}")

@app.get("/")
def home():
    return {"status": "online", "message": "FastAPI is running and connected to MQTT and InsForge. Telegram bot runs in a separate process!"}
