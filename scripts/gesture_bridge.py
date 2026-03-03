# scripts/gesture_bridge.py
import asyncio, json, subprocess, websockets

CLIENTS = set()

async def handler(ws):
    CLIENTS.add(ws)
    try:
        await ws.wait_closed()
    finally:
        CLIENTS.discard(ws)

async def broadcast_gestures():
    proc = await asyncio.create_subprocess_exec(
        "python3", "scripts/gesture_control.py",
        stdout=asyncio.subprocess.PIPE
    )
    while True:
        line = await proc.stdout.readline()
        if not line:
            break
        for ws in CLIENTS.copy():
            await ws.send(line.decode())

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await broadcast_gestures()

asyncio.run(main())