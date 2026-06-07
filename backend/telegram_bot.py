import os
import requests
import time
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
INSFORGE_URL = os.getenv("INSFORGE_URL", "https://your-app.region.insforge.app")
INSFORGE_ANON_KEY = os.getenv("INSFORGE_ANON_KEY", "")

HEADERS = {
    "apikey": INSFORGE_ANON_KEY,
    "Authorization": f"Bearer {INSFORGE_ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}

def send_telegram_alert(message: str):
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    print(f"[BOT] Sending Telegram alert: {message}")
    try:
        res = requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": message, "parse_mode": "Markdown"})
        print(f"[BOT] Telegram API response: HTTP {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Telegram error: {e}")

async def poll_alerts():
    last_processed_id = 0
    url = f"{INSFORGE_URL}/api/database/records/alerts"
    print(f"[BOT] Initializing: fetching latest alert from {url}...")
    
    # Simple trick to get the max ID initially so we don't spam old alerts on startup
    try:
        res = requests.get(f"{url}?order=id.desc&limit=1", headers=HEADERS)
        if res.status_code == 200 and len(res.json()) > 0:
            last_processed_id = res.json()[0].get("id", 0)
        print(f"[BOT] Initial last_processed_id set to: {last_processed_id}")
    except Exception as e:
        print(f"[BOT] Error fetching initial latest alert: {e}")

    while True:
        try:
            query_url = f"{url}?id=gt.{last_processed_id}&order=id.asc"
            res = requests.get(query_url, headers=HEADERS)
            if res.status_code == 200:
                alerts = res.json()
                if alerts:
                    print(f"[BOT] Polled {len(alerts)} new alert(s)")
                for alert in alerts:
                    last_processed_id = alert["id"]
                    msg_text = alert.get("message", "")
                    container_id = alert.get("container_id", "Unknown")
                    severity = alert.get("severity", "INFO")
                    
                    emoji = "📢"
                    if severity == "CRITICAL":
                        emoji = "🚨"
                    elif severity == "HIGH":
                        emoji = "🔥"
                    elif severity == "WARNING":
                        emoji = "⚠️"
                        
                    msg = (
                        f"{emoji} *{severity} ALERT*\n"
                        f"📦 *Container:* `{container_id}`\n"
                        f"💬 *Detail:* {msg_text}\n"
                    )
                    if alert.get("latitude") and alert.get("longitude"):
                        msg += f"📍 *Location:* `{alert['latitude']:.4f}, {alert['longitude']:.4f}`\n"
                        
                    send_telegram_alert(msg)
        except Exception as e:
            print(f"Polling error: {e}")
            
        await asyncio.sleep(10) # Poll every 10 seconds

async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    print(f"[BOT] /start from chat_id={update.effective_chat.id}")
    await update.message.reply_text("👋 Hello! I am the Smart Container Bot.\n\nUse /status to pull the latest telemetry from the database.")

async def chatid_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    print(f"[BOT] /chatid from chat_id={chat_id}")
    await update.message.reply_text(f"Your Telegram chat ID is: `{chat_id}`", parse_mode="Markdown")

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    url = f"{INSFORGE_URL}/api/database/records/telemetry?order=id.desc&limit=15"
    
    try:
        response = requests.get(url, headers=HEADERS)
        if response.status_code != 200 or len(response.json()) == 0:
            await update.message.reply_text("📭 No data found in the database yet.")
            return
            
        data_rows = response.json()
        
        reply = "📊 *Latest Container Telemetry (From DB)*\n\n"
        
        containers = {}
        for row in data_rows:
            cid = row["container_id"]
            if cid not in containers:
                containers[cid] = {
                    "temperature": row.get("temperature"),
                    "humidity": row.get("humidity"),
                    "vibration": row.get("vibration"),
                    "battery_level": row.get("battery_level"),
                    "latitude": row.get("latitude"),
                    "longitude": row.get("longitude")
                }
            else:
                # Merge if missing
                for k, v in containers[cid].items():
                    if v is None and row.get(k) is not None:
                        containers[cid][k] = row.get(k)
                
        for cid, stats in containers.items():
            reply += f"📦 *Container {cid}*\n"
            if stats["temperature"] is not None:
                reply += f"  🌡️ Temp: `{stats['temperature']:.1f}°C`\n"
            if stats["humidity"] is not None:
                reply += f"  💧 Hum: `{stats['humidity']:.1f}%`\n"
            if stats["vibration"] is not None:
                reply += f"  💥 Vib: `{stats['vibration']:.2f}g`\n"
            if stats["battery_level"] is not None:
                reply += f"  🔋 Battery: `{stats['battery_level']:.1f}%`\n"
            if stats["latitude"] is not None and stats["longitude"] is not None:
                reply += f"  📍 GPS: `{stats['latitude']:.4f}, {stats['longitude']:.4f}`\n"
            reply += "\n"
            
        await update.message.reply_text(reply, parse_mode="Markdown")
        
    except Exception as e:
        await update.message.reply_text(f"❌ Error connecting to database: {e}")

async def main():
    print("[BOT] Starting Telegram Bot service...")
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    application.add_handler(CommandHandler("start", start_command))
    application.add_handler(CommandHandler("chatid", chatid_command))
    application.add_handler(CommandHandler("status", status_command))
    
    # Start the application
    await application.initialize()
    await application.start()
    await application.updater.start_polling(drop_pending_updates=True)
    print("[BOT] Telegram updater started polling.")
    
    # Start the polling task
    poll_task = asyncio.create_task(poll_alerts())
    print("[BOT] Database alerts polling task started.")
    
    # Wait forever
    await asyncio.Event().wait()

if __name__ == "__main__":
    asyncio.run(main())
