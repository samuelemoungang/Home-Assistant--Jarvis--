#!/bin/bash

sleep 8

cd /home/samuele24/v0-home-assistant-ui || exit 1

# Activate virtual environment
source .venv/bin/activate

# Stop old processes if they are still running
pkill -f pi-camera-stream.py
pkill -f pi-stats-service.py
sleep 2

# Start services in background
python3 scripts/pi-stats-service.py &
PI_STATS_PID=$!

python3 scripts/pi-camera-stream.py &
PI_CAMERA_PID=$!

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
kill $PI_CAMERA_PID 2>/dev/null
