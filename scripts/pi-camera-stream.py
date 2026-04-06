#!/usr/bin/env python3
"""
Pi Camera Stream - MJPEG stream from IMX500 with optional Supabase snapshot uploads.
Runs on localhost:8081 on the Pi.
"""

from flask import Flask, Response
import threading
import time
import os

from supabase_bridge import upsert_camera_snapshot

app = Flask(__name__)

HAND_DETECTED_FILE = "/tmp/hand_detected"
LATEST_FRAME = None
FRAME_LOCK = threading.Lock()
SNAPSHOT_INTERVAL_SECONDS = 2.0

# Try to import picamera2 (only available on Pi)
try:
    from picamera2 import Picamera2
    import cv2
    import numpy as np

    PI_CAMERA_AVAILABLE = True
except ImportError:
    PI_CAMERA_AVAILABLE = False
    print("WARNING: picamera2 not available. Using placeholder frames.")


def signal_hand_detected():
    try:
        with open(HAND_DETECTED_FILE, "w") as f:
            f.write(str(time.time()))
    except Exception:
        pass


def set_latest_frame(frame_bytes: bytes):
    global LATEST_FRAME
    with FRAME_LOCK:
        LATEST_FRAME = frame_bytes


def get_latest_frame():
    with FRAME_LOCK:
        return LATEST_FRAME


def capture_loop_picamera():
    camera = Picamera2()
    config = camera.create_preview_configuration(main={"size": (640, 480)})
    camera.configure(config)
    camera.start()
    time.sleep(2)

    last_snapshot_at = 0.0

    try:
        while True:
            frame = camera.capture_array()
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            metadata = camera.capture_metadata()
            detections = metadata.get("nn.output", [])

            hand_found = False
            if isinstance(detections, (list, np.ndarray)) and len(detections) > 0:
                for det in detections:
                    try:
                        if len(det) >= 6:
                            class_id = int(det[0])
                            confidence = float(det[1])
                            if confidence > 0.5:
                                x1 = int(det[2] * 640)
                                y1 = int(det[3] * 480)
                                x2 = int(det[4] * 640)
                                y2 = int(det[5] * 480)

                                color = (0, 255, 0)
                                cv2.rectangle(frame_bgr, (x1, y1), (x2, y2), color, 2)
                                label = f"ID:{class_id} {confidence:.0%}"
                                cv2.putText(frame_bgr, label, (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

                                if class_id == 0:
                                    hand_found = True
                    except (IndexError, ValueError):
                        continue

            if hand_found:
                signal_hand_detected()

            ok, buffer = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if not ok:
                time.sleep(0.05)
                continue

            frame_bytes = buffer.tobytes()
            set_latest_frame(frame_bytes)

            now = time.time()
            if now - last_snapshot_at >= SNAPSHOT_INTERVAL_SECONDS:
                try:
                    upsert_camera_snapshot(frame_bytes)
                except Exception as e:
                    print(f"Supabase camera snapshot publish failed: {e}")
                last_snapshot_at = now

            time.sleep(0.066)
    finally:
        camera.stop()


def capture_loop_placeholder():
    try:
        import cv2
        import numpy as np

        last_snapshot_at = 0.0
        while True:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = (30, 30, 40)
            cv2.putText(frame, "No Camera", (200, 230), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (100, 100, 120), 2)
            cv2.putText(frame, "Connect IMX500", (180, 270), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 80, 100), 1)
            ok, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            if ok:
              frame_bytes = buffer.tobytes()
              set_latest_frame(frame_bytes)
              now = time.time()
              if now - last_snapshot_at >= 10:
                  try:
                      upsert_camera_snapshot(frame_bytes)
                  except Exception as e:
                      print(f"Supabase placeholder snapshot publish failed: {e}")
                  last_snapshot_at = now
            time.sleep(1)
    except ImportError:
        while True:
            jpeg_bytes = bytes([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
                0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
                0xFF, 0xD9
            ])
            set_latest_frame(jpeg_bytes)
            time.sleep(2)


def generate_frames():
    while True:
        frame_bytes = get_latest_frame()
        if frame_bytes:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
        time.sleep(0.066)


@app.route("/stream")
def stream():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


if __name__ == "__main__":
    print("Pi Camera Stream running on http://0.0.0.0:8081")
    print(f"Camera available: {PI_CAMERA_AVAILABLE}")

    target = capture_loop_picamera if PI_CAMERA_AVAILABLE else capture_loop_placeholder
    threading.Thread(target=target, daemon=True).start()

    app.run(host="0.0.0.0", port=8081, debug=False, threaded=True)
