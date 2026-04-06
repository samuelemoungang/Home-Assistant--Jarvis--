#!/usr/bin/env python3
"""
Environmental Sensor Monitor
Reads ambient temperature and humidity from GPIO sensors and displays them
in the terminal with continuous refresh. Supports DHT22 and DS18B20 sensors.

Sensors supported:
    - DHT22  (temperature + humidity) via Adafruit CircuitPython library
    - DS18B20 (temperature only)       via 1-Wire interface

Install dependencies:
    pip3 install adafruit-circuitpython-dht
    sudo apt-get install libgpiod2       # required by adafruit_dht

Wiring (DHT22):
    VCC  -> Pin 1  (3.3V)
    DATA -> Pin 7  (GPIO 4)   <- default, change SENSOR_PIN below
    GND  -> Pin 6  (GND)

Wiring (DS18B20):
    VCC  -> Pin 1  (3.3V)
    DATA -> Pin 7  (GPIO 4) with 4.7kΩ pull-up to 3.3V
    GND  -> Pin 6  (GND)
    Enable 1-Wire in raspi-config -> Interface Options -> 1-Wire

Run:
    python3 env-sensor-monitor.py

Options (edit constants below):
    SENSOR_TYPE    : "DHT22" | "DS18B20"
    SENSOR_PIN     : GPIO pin number for DHT22
    REFRESH_SECS   : seconds between reads
    HISTORY_SIZE   : number of past readings kept in memory
"""

import os
import sys
import time
import glob
import signal
import statistics

# ─── Configuration ───────────────────────────────────────────────────────────
SENSOR_TYPE   = "DHT22"   # "DHT22" or "DS18B20"
SENSOR_PIN    = 4          # GPIO BCM pin (DHT22 only)
REFRESH_SECS  = 3          # refresh interval in seconds
HISTORY_SIZE  = 10         # rolling average window
# ─────────────────────────────────────────────────────────────────────────────

# ANSI colours
RESET  = "\033[0m"
BOLD   = "\033[1m"
CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
DIM    = "\033[2m"
BLUE   = "\033[94m"

history_temp: list[float] = []
history_hum:  list[float] = []
running = True


def signal_handler(sig, frame):
    global running
    running = False


signal.signal(signal.SIGINT,  signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


# ─── Sensor Readers ──────────────────────────────────────────────────────────

def read_dht22() -> tuple[float | None, float | None]:
    """Read temperature (°C) and humidity (%) from a DHT22 sensor."""
    try:
        import adafruit_dht
        import board
        pin = getattr(board, f"D{SENSOR_PIN}")
        dht = adafruit_dht.DHT22(pin, use_pulseio=False)
        temperature = dht.temperature
        humidity    = dht.humidity
        dht.exit()
        return temperature, humidity
    except ImportError:
        print(f"{RED}[ERROR]{RESET} adafruit_dht not installed.")
        print(f"       Run:  pip3 install adafruit-circuitpython-dht")
        sys.exit(1)
    except Exception:
        return None, None


def read_ds18b20() -> tuple[float | None, None]:
    """Read temperature (°C) from a DS18B20 via 1-Wire."""
    try:
        base_dir = "/sys/bus/w1/devices/"
        device_folders = glob.glob(base_dir + "28-*")
        if not device_folders:
            return None, None
        device_file = os.path.join(device_folders[0], "temperature")
        with open(device_file, "r") as f:
            raw = f.read().strip()
        temperature = float(raw) / 1000.0
        return round(temperature, 2), None
    except Exception:
        return None, None


def read_sensors() -> tuple[float | None, float | None]:
    """Dispatch to the configured sensor reader."""
    if SENSOR_TYPE == "DHT22":
        return read_dht22()
    elif SENSOR_TYPE == "DS18B20":
        return read_ds18b20()
    else:
        print(f"{RED}[ERROR]{RESET} Unknown SENSOR_TYPE '{SENSOR_TYPE}'. Use 'DHT22' or 'DS18B20'.")
        sys.exit(1)


# ─── Display Helpers ─────────────────────────────────────────────────────────

def temp_color(temp: float) -> str:
    if temp >= 35:
        return RED
    if temp >= 28:
        return YELLOW
    if temp >= 18:
        return GREEN
    return CYAN


def hum_color(hum: float) -> str:
    if hum >= 70 or hum <= 30:
        return YELLOW
    return CYAN


def comfort_label(temp: float | None, hum: float | None) -> str:
    """Return a simple comfort label based on temperature and humidity."""
    if temp is None:
        return f"{DIM}unknown{RESET}"
    if hum is None:
        if temp < 18:
            return f"{CYAN}Cool{RESET}"
        if temp < 26:
            return f"{GREEN}Comfortable{RESET}"
        return f"{YELLOW}Warm{RESET}"
    # with humidity
    if 18 <= temp <= 26 and 40 <= hum <= 60:
        return f"{GREEN}Comfortable{RESET}"
    if temp > 28 and hum > 60:
        return f"{RED}Hot & Humid{RESET}"
    if temp > 28:
        return f"{YELLOW}Warm{RESET}"
    if temp < 18:
        return f"{CYAN}Cool{RESET}"
    if hum > 70:
        return f"{YELLOW}Humid{RESET}"
    if hum < 30:
        return f"{YELLOW}Dry{RESET}"
    return f"{GREEN}Comfortable{RESET}"


def rolling_avg(values: list[float]) -> str:
    if not values:
        return "--"
    return f"{statistics.mean(values):.1f}"


def clear_line():
    sys.stdout.write("\033[2J\033[H")
    sys.stdout.flush()


def draw(temp: float | None, hum: float | None, read_count: int, errors: int):
    """Render the dashboard to stdout."""
    clear_line()

    width = 50
    border = f"{DIM}{'─' * width}{RESET}"

    print(f"\n{BOLD}{CYAN}  Environmental Sensor Monitor{RESET}  {DIM}({SENSOR_TYPE} · GPIO{SENSOR_PIN}){RESET}")
    print(f"  {border}")

    # Temperature
    if temp is not None:
        col = temp_color(temp)
        print(f"  {BOLD}Temperature {RESET}  {col}{BOLD}{temp:6.1f} °C{RESET}")
        if len(history_temp) >= 2:
            mn = min(history_temp)
            mx = max(history_temp)
            avg = rolling_avg(history_temp)
            print(f"  {DIM}  avg {avg}°C  ·  min {mn:.1f}°C  ·  max {mx:.1f}°C{RESET}")
    else:
        print(f"  {BOLD}Temperature {RESET}  {DIM}-- °C   (no reading){RESET}")

    print()

    # Humidity
    if hum is not None:
        col = hum_color(hum)
        print(f"  {BOLD}Humidity    {RESET}  {col}{BOLD}{hum:6.1f} %{RESET}")
        if len(history_hum) >= 2:
            mn = min(history_hum)
            mx = max(history_hum)
            avg = rolling_avg(history_hum)
            print(f"  {DIM}  avg {avg}%   ·  min {mn:.0f}%   ·  max {mx:.0f}%{RESET}")
    elif SENSOR_TYPE == "DS18B20":
        print(f"  {BOLD}Humidity    {RESET}  {DIM}n/a   (DS18B20 is temperature-only){RESET}")
    else:
        print(f"  {BOLD}Humidity    {RESET}  {DIM}-- %    (no reading){RESET}")

    print()
    print(f"  {border}")
    print(f"  Comfort  {comfort_label(temp, hum)}")
    print(f"  {border}")
    print(f"  {DIM}reads: {read_count}  ·  errors: {errors}  ·  interval: {REFRESH_SECS}s  ·  Ctrl+C to exit{RESET}\n")


# ─── Main Loop ───────────────────────────────────────────────────────────────

def main():
    global history_temp, history_hum

    read_count = 0
    error_count = 0
    last_temp: float | None = None
    last_hum:  float | None = None

    print(f"{BOLD}{CYAN}Environmental Sensor Monitor{RESET} — starting up (sensor: {SENSOR_TYPE})…")
    time.sleep(0.5)

    while running:
        temp, hum = read_sensors()

        if temp is not None:
            last_temp = temp
            history_temp.append(temp)
            if len(history_temp) > HISTORY_SIZE:
                history_temp.pop(0)
        else:
            error_count += 1

        if hum is not None:
            last_hum = hum
            history_hum.append(hum)
            if len(history_hum) > HISTORY_SIZE:
                history_hum.pop(0)

        read_count += 1
        draw(last_temp, last_hum, read_count, error_count)
        time.sleep(REFRESH_SECS)

    print(f"\n{DIM}Monitor stopped.{RESET}\n")


if __name__ == "__main__":
    main()
