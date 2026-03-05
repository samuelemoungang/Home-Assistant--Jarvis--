#!/usr/bin/env python3

from flask import Flask, Response
import time
import socket
import json
import cv2
import numpy as np
import mediapipe as mp
from picamera2 import Picamera2

app = Flask(__name__)

HAND_DETECTED_FILE = "/tmp/hand_detected"

# -------- MediaPipe setup --------
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

hands_detector = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.5,
)

GESTURE_MAP = {
    1: "finance",
    2: "home",
    3: "offline-ai",
    4: "raspberry-home",
}

# -------- porta libera --------
def find_free_port(start=8081, end=8090):
    for port in range(start, end):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("0.0.0.0", port)) != 0:
                return port
    raise RuntimeError("No free port available")


# -------- segnale gesture --------
def signal_hand_detected():
    try:
        with open(HAND_DETECTED_FILE, "w") as f:
            f.write(str(time.time()))
    except:
        pass


# -------- conteggio dita --------
def count_fingers(hand_landmarks):

    tips = [8, 12, 16, 20]
    pips = [6, 10, 14, 18]

    fingers = 0

    for tip, pip in zip(tips, pips):
        if hand_landmarks.landmark[tip].y < hand_landmarks.landmark[pip].y:
            fingers += 1

    return fingers


# -------- camera generator --------
def generate_frames():

    camera = Picamera2()
    config = camera.create_preview_configuration(main={"size": (640, 480)})
    camera.configure(config)
    camera.start()

    time.sleep(2)

    last_count = 0
    stable_frames = 0
    STABILITY = 8

    try:
        while True:

            frame = camera.capture_array()
            frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands_detector.process(rgb)

            finger_count = 0

            if results.multi_hand_landmarks:

                for hand_landmarks in results.multi_hand_landmarks:

                    mp_draw.draw_landmarks(
                        frame,
                        hand_landmarks,
                        mp_hands.HAND_CONNECTIONS
                    )

                    finger_count = count_fingers(hand_landmarks)

            # ----- stabilità gesture -----
            if finger_count == last_count and finger_count > 0:
                stable_frames += 1
            else:
                stable_frames = 0
                last_count = finger_count

            if stable_frames >= STABILITY:

                if finger_count in GESTURE_MAP:

                    event = {
                        "type": "gesture_navigation",
                        "fingers": finger_count,
                        "target": GESTURE_MAP[finger_count],
                    }

                    print(json.dumps(event), flush=True)

                    signal_hand_detected()

                stable_frames = 0

            # ----- overlay -----
            cv2.putText(
                frame,
                f"Fingers: {finger_count}",
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 200),
                2
            )

            # ----- encode MJPEG -----
            _, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            frame_bytes = buffer.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )

            time.sleep(0.03)

    finally:
        camera.stop()


# -------- stream endpoint --------
@app.route("/stream")
def stream():
    return Response(
        generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


# -------- homepage semplice --------
@app.route("/")
def index():
    return '<img src="/stream">'


# -------- main --------
if __name__ == "__main__":

    port = find_free_port()

    print(f"Pi Camera Stream running on http://0.0.0.0:{port}")
    print("Gesture detection enabled")

    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)