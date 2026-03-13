"""
MediaPipe Hands - Finger Counting Baseline for Raspberry Pi 5
=============================================================

This script detects hands via webcam and counts raised fingers (1-5).
Each number maps to a navigation event in the dashboard UI.

Requirements (install on Raspberry Pi):
    pip install mediapipe opencv-python

Usage:
    python gesture_control.py

Gesture -> Event Mapping (raw count forwarded to manager):
    1-5 fingers -> gesture event with finger count
"""

import cv2
import mediapipe as mp
import json
import sys
import time
import os

# Hand detection state file (read by pi-stats-service.py)
HAND_DETECTED_FILE = "/tmp/hand_detected"

def update_hand_detected(detected: bool):
    """Write timestamp to file when hand is detected, or remove file when not."""
    try:
        if detected:
            with open(HAND_DETECTED_FILE, "w") as f:
                f.write(str(time.time()))
        elif os.path.exists(HAND_DETECTED_FILE):
            os.remove(HAND_DETECTED_FILE)
    except Exception:
        pass

# MediaPipe setup
mp_hands = mp.solutions.hands
mp_draw = mp.solutions.drawing_utils

# Finger tip landmark indices (MediaPipe hand model)
FINGER_TIPS = [
    mp_hands.HandLandmark.INDEX_FINGER_TIP,
    mp_hands.HandLandmark.MIDDLE_FINGER_TIP,
    mp_hands.HandLandmark.RING_FINGER_TIP,
    mp_hands.HandLandmark.PINKY_TIP,
]

FINGER_PIPS = [
    mp_hands.HandLandmark.INDEX_FINGER_PIP,
    mp_hands.HandLandmark.MIDDLE_FINGER_PIP,
    mp_hands.HandLandmark.RING_FINGER_PIP,
    mp_hands.HandLandmark.PINKY_PIP,
]

THUMB_TIP = mp_hands.HandLandmark.THUMB_TIP
THUMB_IP = mp_hands.HandLandmark.THUMB_IP

# Event mapping (manager will map targets by current mode/context)
GESTURE_MAP = {
    1: "gesture-1",
    2: "gesture-2",
    3: "gesture-3",
    4: "gesture-4",
    5: "gesture-5",
}


def count_fingers(hand_landmarks, handedness_label):
    """
    Count the number of raised fingers.
    Returns an integer 0-5.
    """
    fingers_up = 0

    # Thumb: compare tip.x vs ip.x (direction depends on handedness)
    thumb_tip = hand_landmarks.landmark[THUMB_TIP]
    thumb_ip = hand_landmarks.landmark[THUMB_IP]

    if handedness_label == "Right":
        if thumb_tip.x < thumb_ip.x:
            fingers_up += 1
    else:
        if thumb_tip.x > thumb_ip.x:
            fingers_up += 1

    # Other 4 fingers: tip.y < pip.y means finger is raised
    for tip_id, pip_id in zip(FINGER_TIPS, FINGER_PIPS):
        tip = hand_landmarks.landmark[tip_id]
        pip = hand_landmarks.landmark[pip_id]
        if tip.y < pip.y:
            fingers_up += 1

    return fingers_up


def emit_navigation_event(finger_count):
    """
    Emit a navigation event as JSON to stdout.
    The Next.js app can read this via a WebSocket bridge or subprocess.
    """
    if finger_count in GESTURE_MAP:
        event = {
            "type": "gesture_navigation",
            "fingers": finger_count,
            "target": GESTURE_MAP[finger_count],
        }
        print(json.dumps(event), flush=True)


def main():
    cap = cv2.VideoCapture(0)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

    if not cap.isOpened():
        print(json.dumps({"type": "error", "message": "Cannot open camera"}), flush=True)
        sys.exit(1)

    print(json.dumps({"type": "status", "message": "Gesture control started"}), flush=True)

    # Stability: require same count for N consecutive frames before triggering
    STABILITY_THRESHOLD = 10
    last_count = 0
    stable_frames = 0

    with mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5,
    ) as hands:

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            # Flip for selfie view
            frame = cv2.flip(frame, 1)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)

            current_count = 0

            if results.multi_hand_landmarks and results.multi_handedness:
                for hand_landmarks, handedness_info in zip(
                    results.multi_hand_landmarks, results.multi_handedness
                ):
                    handedness_label = handedness_info.classification[0].label
                    current_count = count_fingers(hand_landmarks, handedness_label)

                    # Draw landmarks on frame (for debug visualization)
                    mp_draw.draw_landmarks(
                        frame, hand_landmarks, mp_hands.HAND_CONNECTIONS
                    )

            # Stability check
            if current_count == last_count and current_count > 0:
                stable_frames += 1
            else:
                stable_frames = 0
                last_count = current_count

            if stable_frames == STABILITY_THRESHOLD:
                emit_navigation_event(current_count)
                stable_frames = 0  # Reset after emitting

            # Display (optional, can be disabled for headless)
            cv2.putText(
                frame,
                f"Fingers: {current_count}",
                (10, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 200),
                2,
            )

            cv2.imshow("Pi Gesture Control", frame)

            if cv2.waitKey(1) & 0xFF == ord("q"):
                break

    cap.release()
    cv2.destroyAllWindows()
    print(json.dumps({"type": "status", "message": "Gesture control stopped"}), flush=True)


if __name__ == "__main__":
    main()
