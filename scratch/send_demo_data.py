import json
import math
import sys
import time
from datetime import datetime

import paho.mqtt.client as mqtt


HOST = sys.argv[1] if len(sys.argv) > 1 else "16.171.206.168"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 1883
INTERVAL_SECONDS = float(sys.argv[3]) if len(sys.argv) > 3 else 3
MAX_TICKS = int(sys.argv[4]) if len(sys.argv) > 4 else math.ceil(60 / INTERVAL_SECONDS)
ALERT_EVERY_TICKS = int(sys.argv[5]) if len(sys.argv) > 5 else 6

DEMO_CONTAINERS = [
    {
        "id": "002",
        "base_temp": 6.2,
        "base_hum": 48,
        "lat": 41.3091,
        "lng": 69.2797,
        "speed": 0.18,
    },
    {
        "id": "003",
        "base_temp": 18.6,
        "base_hum": 58,
        "lat": 41.3364,
        "lng": 69.3342,
        "speed": 0.28,
    },
]


def timestamp():
    return datetime.now().strftime("%d/%m/%Y %H:%M:%S")


def publish_json(client, topic, payload):
    client.publish(topic, json.dumps(payload))


def main():
    client = mqtt.Client()
    client.connect(HOST, PORT, 60)
    client.loop_start()

    print(f"Connected to {HOST}:{PORT}")
    if MAX_TICKS > 0:
        print(f"Sending fake data for containers 002 and 003 for {MAX_TICKS} ticks.")
    else:
        print("Sending fake data for containers 002 and 003 until Ctrl+C.")
    print(f"Alert spikes: first tick and every {ALERT_EVERY_TICKS} tick(s).")

    tick = 0
    try:
        while MAX_TICKS == 0 or tick < MAX_TICKS:
            tick += 1
            absolute_tick = int(time.time() / max(INTERVAL_SECONDS, 1)) + tick
            for container in DEMO_CONTAINERS:
                container_offset = int(container["id"])
                drift = math.sin(absolute_tick / 2 + container_offset) * 1.4
                humidity_drift = math.cos(absolute_tick / 3 + container_offset) * 6
                vibration_spike = tick == 1 or (ALERT_EVERY_TICKS > 0 and tick % ALERT_EVERY_TICKS == 0)
                lat = container["lat"] + math.sin(absolute_tick / 4 + container_offset) * 0.006
                lng = container["lng"] + math.cos(absolute_tick / 4 + container_offset) * 0.006
                speed = container["speed"] + abs(math.sin(absolute_tick / 2 + container_offset)) * 0.45
                vib_peak = 4.6 if vibration_spike else 0.6 + abs(math.sin(absolute_tick / 2 + container_offset)) * 1.8
                vib_avg = vib_peak / 3

                temp_payload = {
                    "timestamp": timestamp(),
                    "temp": round(container["base_temp"] + drift, 1),
                    "hum": round(container["base_hum"] + humidity_drift, 1),
                }
                vibration_payload = {
                    "timestamp": timestamp(),
                    "lat": round(lat, 8),
                    "lng": round(lng, 8),
                    "speed": round(speed, 5),
                    "vib_avg": round(vib_avg, 9),
                    "vib_peak": round(vib_peak, 9),
                    "unit": "g",
                }
                location_payload = {
                    "timestamp": timestamp(),
                    "lat": round(lat, 8),
                    "lng": round(lng, 8),
                }

                publish_json(client, f"bunker/{container['id']}/temperature", temp_payload)
                publish_json(client, f"bunker/{container['id']}/vibration", vibration_payload)
                publish_json(client, f"bunker/{container['id']}/location", location_payload)

                print(
                    f"[{container['id']}] "
                    f"temp={temp_payload['temp']} "
                    f"hum={temp_payload['hum']} "
                    f"vib={vibration_payload['vib_peak']} "
                    f"speed={vibration_payload['speed']}"
                )

            time.sleep(INTERVAL_SECONDS)
    except KeyboardInterrupt:
        print("\nStopping demo sender.")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
