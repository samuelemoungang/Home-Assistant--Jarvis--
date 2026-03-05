#!/usr/bin/env python3
"""
Pi Camera Stream - MJPEG stream from IMX500 with object detection.
Runs on localhost:8081 on the Pi.

Install:
    pip3 install flask picamera2 opencv-python-headless

The IMX500 AI camera supports on-chip object detection.
This script streams the video feed as MJPEG and writes hand detection
status to /tmp/hand_detected for the stats service to read.

Run:
    python3 pi-camera-stream.py

Endpoints:
    GET /stream -> MJPEG video stream
"""

from flask import Flask, Response
import time
import os
import io

app = Flask(__name__)

HAND_DETECTED_FILE = "/tmp/hand_detected"

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
    """Write current timestamp to the hand detection file."""
    try:
        with open(HAND_DETECTED_FILE, "w") as f:
            f.write(str(time.time()))
    except Exception:
        pass


def generate_frames_picamera():
    """Generate MJPEG frames from the IMX500 camera with object detection."""
    camera = Picamera2()
    config = camera.create_preview_configuration(main={"size": (640, 480)})
    camera.configure(config)
    camera.start()

    # Allow camera to warm up
    time.sleep(2)

    try:
        while True:
            frame = camera.capture_array()

            # Convert RGB to BGR for OpenCV
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            # IMX500 on-chip detection results
            # The Picamera2 library provides metadata with detection results
            metadata = camera.capture_metadata()
            detections = metadata.get("nn.output", [])

            # Check for hand/person detections and draw bounding boxes
            hand_found = False
            if isinstance(detections, (list, np.ndarray)) and len(detections) > 0:
                for det in detections:
                    # Detection format depends on the model loaded on IMX500
                    # Common format: [class_id, confidence, x1, y1, x2, y2]
                    try:
                        if len(det) >= 6:
                            class_id = int(det[0])
                            confidence = float(det[1])
                            if confidence > 0.5:
                                x1 = int(det[2] * 640)
                                y1 = int(det[3] * 480)
                                x2 = int(det[4] * 640)
                                y2 = int(det[5] * 480)

                                # Draw bounding box
                                color = (0, 255, 0)
                                cv2.rectangle(frame_bgr, (x1, y1), (x2, y2), color, 2)
                                label = f"ID:{class_id} {confidence:.0%}"
                                cv2.putText(frame_bgr, label, (x1, y1 - 8),
                                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

                                # COCO class 0 = person, which includes hands
                                if class_id == 0:
                                    hand_found = True
                    except (IndexError, ValueError):
                        continue

            if hand_found:
                signal_hand_detected()

            # Encode frame as JPEG
            _, buffer = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

            # ~15 FPS
            time.sleep(0.066)
    finally:
        camera.stop()


def generate_frames_placeholder():
    """Generate placeholder frames when no camera is available."""
    try:
        import cv2
        import numpy as np
        while True:
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            frame[:] = (30, 30, 40)
            cv2.putText(frame, "No Camera", (200, 230),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (100, 100, 120), 2)
            cv2.putText(frame, "Connect IMX500", (180, 270),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (80, 80, 100), 1)
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
            time.sleep(1)
    except ImportError:
        # No OpenCV either, send a minimal 1x1 JPEG
        while True:
            # Minimal JPEG: 1x1 black pixel
            jpeg_bytes = bytes([
                0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46,
                0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
                0xFF, 0xD9
            ])
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"
            )
            time.sleep(2)


@app.route("/stream")
def stream():
    if PI_CAMERA_AVAILABLE:
        return Response(
            generate_frames_picamera(),
            mimetype="multipart/x-mixed-replace; boundary=frame"
        )
    else:
        return Response(
            generate_frames_placeholder(),
            mimetype="multipart/x-mixed-replace; boundary=frame"
        )


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


if __name__ == "__main__":
    print("Pi Camera Stream running on http://192.168.1.160:8081")
    print(f"Camera available: {PI_CAMERA_AVAILABLE}")
    app.run(host="192.168.1.160", port=8081, debug=False, threaded=True)
