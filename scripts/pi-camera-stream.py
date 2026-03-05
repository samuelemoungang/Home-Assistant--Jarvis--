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
import socket

app = Flask(__name__)

HAND_DETECTED_FILE = "/tmp/hand_detected"

# ---- Import camera separato (evita falsi errori) ----
PI_CAMERA_AVAILABLE = False
try:
    from picamera2 import Picamera2
    PI_CAMERA_AVAILABLE = True
except ImportError:
    print("Picamera2 not available")

try:
    import cv2
    import numpy as np
except ImportError:
    print("OpenCV or NumPy missing")


# ---- trova una porta libera ----
def find_free_port(start=8081, end=8090):
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("0.0.0.0", port)) != 0:
                return port
    raise RuntimeError("No free port available")


def signal_hand_detected():
    try:
        with open(HAND_DETECTED_FILE, "w") as f:
            f.write(str(time.time()))
    except Exception:
        pass


def generate_frames_picamera():
    camera = Picamera2()
    config = camera.create_preview_configuration(main={"size": (640, 480)})
    camera.configure(config)
    camera.start()

    time.sleep(2)

    try:
        while True:
            frame = camera.capture_array()
            frame_bgr = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            metadata = camera.capture_metadata()
            detections = metadata.get("nn.output", [])

            hand_found = False

            if isinstance(detections, (list, np.ndarray)):
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

                                cv2.rectangle(frame_bgr, (x1, y1), (x2, y2), (0,255,0), 2)
                                cv2.putText(
                                    frame_bgr,
                                    f"ID:{class_id} {confidence:.0%}",
                                    (x1, y1 - 8),
                                    cv2.FONT_HERSHEY_SIMPLEX,
                                    0.4,
                                    (0,255,0),
                                    1
                                )

                                if class_id == 0:
                                    hand_found = True
                    except Exception:
                        continue

            if hand_found:
                signal_hand_detected()

            _, buffer = cv2.imencode(".jpg", frame_bgr, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

            time.sleep(0.066)

    finally:
        camera.stop()


def generate_frames_placeholder():
    while True:
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(frame, "No Camera", (200,240),
                    cv2.FONT_HERSHEY_SIMPLEX,1,(200,200,200),2)

        _, buffer = cv2.imencode(".jpg", frame)
        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n" + buffer.tobytes() + b"\r\n"
        )
        time.sleep(1)


@app.route("/stream")
def stream():
    generator = generate_frames_picamera if PI_CAMERA_AVAILABLE else generate_frames_placeholder
    return Response(generator(),
                    mimetype="multipart/x-mixed-replace; boundary=frame")


if __name__ == "__main__":
    port = find_free_port()

    print(f"Pi Camera Stream running on http://0.0.0.0:{port}")
    print(f"Camera available: {PI_CAMERA_AVAILABLE}")

    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)