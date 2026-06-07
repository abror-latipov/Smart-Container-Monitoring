# Smart Container Monitor

IoT Smart Shipping Container monitoring platform with:

- React/Vite frontend dashboard
- FastAPI MQTT ingestion backend
- Spring Boot REST backend
- Mosquitto MQTT broker
- Telegram bot service
- InsForge cloud database integration

## Prerequisites

Install and start:

- Docker Desktop
- Docker Compose / `docker-compose`

Optional for local frontend checks:

- Node.js 20+

The easiest and recommended way to run the whole project is Docker Compose.

## Run The Full Project

From the project root:

```powershell
cd C:\Users\Asror\Desktop\smart_container
copy .env.example .env
docker-compose up -d --build
```

Before starting Docker, open `.env` and replace the placeholder InsForge, MQTT, and Telegram values with your real local credentials.

This builds and starts all services:

- `mosquitto`
- `backend`
- `telegram_bot`
- `frontend`
- `spring_backend`

Check that everything is running:

```powershell
docker-compose ps
```

Open the app:

```text
http://localhost:5173
```

Useful service URLs:

```text
Frontend:        http://localhost:5173
FastAPI:         http://localhost:8000
Spring backend:  http://localhost:8080
Spring health:   http://localhost:8080/actuator/health
MQTT broker:     localhost:1883
MQTT websocket:  localhost:9001
```

## Stop The Project

```powershell
docker-compose down
```

## View Logs

All services:

```powershell
docker-compose logs -f
```

One service:

```powershell
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f spring_backend
docker-compose logs -f telegram_bot
docker-compose logs -f mosquitto
```

## Verify Services

FastAPI health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8000/
```

Spring Boot health check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:8080/actuator/health
```

Frontend check:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:5173/
```

## Frontend Local Checks

If you want to check the React frontend outside Docker:

```powershell
cd C:\Users\Asror\Desktop\smart_container\frontend
npm.cmd install
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Use `npm.cmd` on Windows PowerShell if `npm` is blocked by the execution policy.

## Important Notes

- The backend Docker build ignores local Python virtual environments through `backend/.dockerignore`. Do not remove this file; Docker can fail on Windows if it tries to copy `.venv/lib64`.
- The frontend calls the Spring backend for dashboard data and calls the FastAPI backend on `http://localhost:8000` when publishing device settings to MQTT.
- The FastAPI backend connects to MQTT and InsForge when it starts.
- The Spring backend connects to the InsForge PostgreSQL database configured in `spring_backend/src/main/resources/application.yml`.
- The Telegram bot runs as a separate container and polls alerts from InsForge.

## Common Problems

### Docker says permission denied

Make sure Docker Desktop is running. If needed, restart Docker Desktop and run:

```powershell
docker-compose ps
```

### `docker compose` does not work

This project works with the older command:

```powershell
docker-compose up -d --build
```

### PowerShell blocks `npm`

Use:

```powershell
npm.cmd run lint
npm.cmd run build
```

### Frontend builds but shows a chunk size warning

This is not a run failure. It means the frontend JavaScript bundle is large and could later be optimized with code splitting.

## Send Fake Demo Data

The project includes fake MQTT data senders in `scratch/`.

Recommended sender:

```powershell
cd C:\Users\Asror\Desktop\smart_container\scratch
node send_demo_data.js 16.171.206.168 1883 3000 20
```

Arguments:

```text
node send_demo_data.js <mqtt-host> <mqtt-port> <interval-ms> <max-ticks>
```

Example for a short test:

```powershell
node send_demo_data.js 16.171.206.168 1883 1000 2
```

This publishes fake data for MQTT containers:

- `bunker/002/temperature`
- `bunker/002/vibration`
- `bunker/002/location`
- `bunker/003/temperature`
- `bunker/003/vibration`
- `bunker/003/location`

The FastAPI backend maps those MQTT IDs to database containers `2` and `3`, saves the telemetry to InsForge, and the dashboard should update after refresh.

To listen and confirm messages are reaching the MQTT broker:

```powershell
cd C:\Users\Asror\Desktop\smart_container\scratch
node mqtt_listen.js 16.171.206.168 1883 bunker/+/+ 10000
```

The Python sender also exists:

```powershell
python send_demo_data.py 16.171.206.168 1883 3 20
```

Use the JavaScript sender if Python or `paho-mqtt` is not installed locally.

## Telegram Notifications

The Telegram bot sends notifications only when new rows are created in the `alerts` table after the bot has started.

Useful commands:

```powershell
docker-compose logs -f telegram_bot
```

In Telegram, open the bot and send:

```text
/start
/chatid
/status
```

Use `/chatid` to confirm the chat ID that should receive alerts.

The bot reads these settings:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

At the moment, if those environment variables are not set, `backend/telegram_bot.py` falls back to the hardcoded values in the file. If notifications are going to the wrong Telegram account, set `TELEGRAM_CHAT_ID` to your own chat ID and restart the bot.

Example Docker Compose environment:

```yaml
telegram_bot:
  environment:
    - TELEGRAM_BOT_TOKEN=your_bot_token_here
    - TELEGRAM_CHAT_ID=your_chat_id_here
```

Restart the bot after changing configuration:

```powershell
docker-compose up -d --build telegram_bot
```

Important behavior:

- Old alerts are skipped when the bot starts, so it does not spam historical alerts.
- Vibration alerts have a 5-minute cooldown per container.
- Normal fake data may not always create new alerts unless vibration or temperature passes the backend thresholds.
- If logs show `NetworkError` or `Name or service not known`, the container is having trouble reaching `api.telegram.org`.
