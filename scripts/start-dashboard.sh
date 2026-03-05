#!/bin/bash
# Pi Dashboard Startup Script
# ===========================
# This script starts all required services and launches the dashboard in kiosk mode.

sleep 8

cd /home/samuele24/v0-home-assistant-ui

# Activate virtual environment
source .venv/bin/activate

# Start the Pi Stats Service (system info, sensors) in background
python3 scripts/pi-stats-service.py &
PI_STATS_PID=$!

# Start the Gesture Manager (controls gesture_control.py and pi-camera-stream.py)
# This automatically starts gesture_control.py in "gesture" mode
python3 scripts/gesture_manager.py &
GESTURE_MANAGER_PID=$!

# Give services time to start
sleep 3

# Disable screensaver (X11)
xset s off
xset -dpms
xset s noblank

# Launch Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  --start-fullscreen \
  "https://v0-home-assistant-ui-beta.vercel.app/"

# Cleanup on exit
kill $PI_STATS_PID 2>/dev/null
kill $GESTURE_MANAGER_PID 2>/dev/null
