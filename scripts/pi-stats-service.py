#!/usr/bin/env python3
"""
Pi Stats Service - Flask API for Raspberry Pi system stats.
Runs on localhost:8080 on the Pi.

Install:
    pip3 install flask psutil

Run:
    python3 pi-stats-service.py

Endpoints:
    GET /api/stats   -> CPU temp, RAM, power, uptime, hand detection
    GET /api/sensors -> Temperature & humidity from GPIO sensors (when connected)
"""

from flask import Flask, jsonify
import psutil
import os
import time
import threading

from supabase_bridge import upsert_pi_runtime_status

app = Flask(__name__)

# Track hand detection state (updated by the camera service via shared file)
HAND_DETECTED_FILE = "/tmp/hand_detected"


def get_cpu_temperature():
    """Read CPU temperature from thermal zone."""
    try:
        with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
            temp = float(f.read().strip()) / 1000.0
            return round(temp, 1)
    except Exception:
        return 0.0


def get_uptime():
    """Get system uptime as human-readable string."""
    try:
        uptime_seconds = time.time() - psutil.boot_time()
        hours = int(uptime_seconds // 3600)
        minutes = int((uptime_seconds % 3600) // 60)
        if hours > 24:
            days = hours // 24
            hours = hours % 24
            return f"{days}d {hours}h {minutes}m"
        return f"{hours}h {minutes}m"
    except Exception:
        return "unknown"



def is_hand_detected():
    """Check if the camera service has flagged a hand detection."""
    try:
        if os.path.exists(HAND_DETECTED_FILE):
            with open(HAND_DETECTED_FILE, "r") as f:
                data = f.read().strip()
                # File should contain a timestamp; if recent (< 2 seconds), hand is detected
                ts = float(data)
                return (time.time() - ts) < 2.0
    except Exception:
        pass
    return False


def read_sensors():
    """
    Read temperature and humidity from GPIO sensors.
    Currently returns null -- connect a DHT22 or DS18B20 sensor and uncomment the code below.
    """
    temperature = None
    humidity = None

    # === Uncomment when DHT22 sensor is connected ===
    # import adafruit_dht
    # import board
    # try:
    #     dht = adafruit_dht.DHT22(board.D4)  # GPIO pin 4
    #     temperature = dht.temperature
    #     humidity = dht.humidity
    # except Exception:
    #     pass

    # === Uncomment when DS18B20 sensor is connected ===
    # try:
    #     with open("/sys/bus/w1/devices/28-*/temperature", "r") as f:
    #         temperature = float(f.read().strip()) / 1000.0
    # except Exception:
    #     pass

    return {
        "temperature": temperature,
        "humidity": humidity,
    }


def build_status_payload():
    mem = psutil.virtual_memory()
    sensors = read_sensors()
    return {
        "cpu_temp": get_cpu_temperature(),
        "ram_percent": round(mem.percent, 1),
        "ram_used": round(mem.used / (1024 * 1024), 0),
        "ram_total": round(mem.total / (1024 * 1024), 0),
        "uptime": get_uptime(),
        "hand_detected": is_hand_detected(),
        "temperature": sensors["temperature"],
        "humidity": sensors["humidity"],
        "source_updated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def publish_status_loop():
    while True:
        try:
            upsert_pi_runtime_status(build_status_payload())
        except Exception as e:
            print(f"Supabase runtime status publish failed: {e}")
        time.sleep(5)


@app.route("/api/stats")
def stats():
    payload = build_status_payload()
    return jsonify({
        "cpu_temp": payload["cpu_temp"],
        "ram_percent": payload["ram_percent"],
        "ram_used": payload["ram_used"],
        "ram_total": payload["ram_total"],
        "uptime": payload["uptime"],
        "hand_detected": payload["hand_detected"],
    })


@app.route("/api/sensors")
def sensors():
    return jsonify(read_sensors())


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.after_request
def add_cors_headers(response):
    """Allow CORS from any origin (local dashboard access)."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


if __name__ == "__main__":
    print("Pi Stats Service running on http://0.0.0.0:8080")
    threading.Thread(target=publish_status_loop, daemon=True).start()
    app.run(host="0.0.0.0", port=8080, debug=False)
