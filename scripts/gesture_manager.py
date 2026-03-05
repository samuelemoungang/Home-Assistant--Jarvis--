#!/usr/bin/env python3
"""
Gesture Manager Service - Controls gesture_control.py and pi-camera-stream.py
Runs on localhost:8082 on the Pi.

This service manages which script has control of the camera:
- gesture_control.py for navigation (1-4 fingers)
- pi-camera-stream.py for camera viewing

Install:
    pip3 install flask

Run:
    python3 gesture_manager.py

Endpoints:
    GET  /api/status          -> Current active mode and script
    POST /api/mode/gesture    -> Switch to gesture control mode
    POST /api/mode/camera     -> Switch to camera stream mode
    POST /api/mode/finance    -> Switch to finance gesture mode (1-4 = finance sub-sections)
    GET  /api/gesture-events  -> SSE stream of gesture navigation events
"""

from flask import Flask, jsonify, Response
import subprocess
import signal
import os
import time
import threading
import queue
import json

app = Flask(__name__)

# Process handles
gesture_process = None
camera_process = None
current_mode = "gesture"  # "gesture", "camera", "finance"

# Gesture event queue for SSE
gesture_events = queue.Queue()

# Script paths (relative to pi-backend location)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
GESTURE_SCRIPT = os.path.join(SCRIPT_DIR, "gesture_control.py")
CAMERA_SCRIPT = os.path.join(SCRIPT_DIR, "pi-camera-stream.py")

# Finance mode gesture mapping
FINANCE_GESTURE_MAP = {
    1: "income",
    2: "budgets", 
    3: "savings",
    4: "reports",
}

# Main navigation gesture mapping
MAIN_GESTURE_MAP = {
    1: "finance",
    2: "home",
    3: "offline-ai",
    4: "exit",
}


def kill_process(proc):
    """Safely kill a subprocess."""
    if proc and proc.poll() is None:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()


def read_gesture_output(proc, mode):
    """Read gesture events from subprocess stdout and queue them."""
    global current_mode
    try:
        for line in iter(proc.stdout.readline, b''):
            if proc.poll() is not None:
                break
            try:
                data = json.loads(line.decode().strip())
                if data.get("type") == "gesture_navigation":
                    fingers = data.get("fingers", 0)
                    
                    # Map based on current mode
                    if mode == "gesture":
                        target = MAIN_GESTURE_MAP.get(fingers)
                    elif mode == "finance":
                        target = FINANCE_GESTURE_MAP.get(fingers)
                    else:
                        target = None
                    
                    if target:
                        event = {
                            "type": "navigate",
                            "target": target,
                            "fingers": fingers,
                            "mode": mode,
                            "timestamp": time.time()
                        }
                        gesture_events.put(event)
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
    except Exception as e:
        print(f"Gesture reader error: {e}")


def start_gesture_control(mode="gesture"):
    """Start gesture_control.py in background."""
    global gesture_process
    kill_process(gesture_process)
    
    try:
        gesture_process = subprocess.Popen(
            ["python3", GESTURE_SCRIPT],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=1
        )
        # Start reader thread
        reader = threading.Thread(
            target=read_gesture_output, 
            args=(gesture_process, mode),
            daemon=True
        )
        reader.start()
        return True
    except Exception as e:
        print(f"Failed to start gesture control: {e}")
        return False


def start_camera_stream():
    """Start pi-camera-stream.py in background."""
    global camera_process
    kill_process(camera_process)
    
    try:
        camera_process = subprocess.Popen(
            ["python3", CAMERA_SCRIPT],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return True
    except Exception as e:
        print(f"Failed to start camera stream: {e}")
        return False


@app.route("/api/status")
def status():
    return jsonify({
        "mode": current_mode,
        "gesture_running": gesture_process is not None and gesture_process.poll() is None,
        "camera_running": camera_process is not None and camera_process.poll() is None,
    })


@app.route("/api/mode/gesture", methods=["POST"])
def mode_gesture():
    """Switch to main gesture control mode (for home screen navigation)."""
    global current_mode
    
    # Stop camera if running
    kill_process(camera_process)
    
    # Start gesture control
    success = start_gesture_control("gesture")
    if success:
        current_mode = "gesture"
        return jsonify({"success": True, "mode": "gesture"})
    return jsonify({"success": False, "error": "Failed to start gesture control"}), 500


@app.route("/api/mode/camera", methods=["POST"])
def mode_camera():
    """Switch to camera stream mode (stops gesture to free camera)."""
    global current_mode
    
    # Stop gesture control
    kill_process(gesture_process)
    
    # Start camera stream
    success = start_camera_stream()
    if success:
        current_mode = "camera"
        return jsonify({"success": True, "mode": "camera"})
    return jsonify({"success": False, "error": "Failed to start camera stream"}), 500


@app.route("/api/mode/finance", methods=["POST"])
def mode_finance():
    """Switch to finance gesture mode (1-4 fingers = finance sub-sections)."""
    global current_mode
    
    # Stop camera if running
    kill_process(camera_process)
    
    # Start gesture control with finance mapping
    success = start_gesture_control("finance")
    if success:
        current_mode = "finance"
        return jsonify({"success": True, "mode": "finance"})
    return jsonify({"success": False, "error": "Failed to start gesture control"}), 500


@app.route("/api/gesture-events")
def gesture_events_sse():
    """Server-Sent Events stream for gesture navigation events."""
    def generate():
        while True:
            try:
                event = gesture_events.get(timeout=30)
                yield f"data: {json.dumps(event)}\n\n"
            except queue.Empty:
                # Send keepalive
                yield f": keepalive\n\n"
    
    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def cleanup():
    """Cleanup on exit."""
    kill_process(gesture_process)
    kill_process(camera_process)


if __name__ == "__main__":
    import atexit
    atexit.register(cleanup)
    
    # Start in gesture mode by default
    print("Starting Gesture Manager on http://0.0.0.0:8082")
    print("Starting gesture control...")
    start_gesture_control("gesture")
    
    app.run(host="0.0.0.0", port=8082, debug=False, threaded=True)
