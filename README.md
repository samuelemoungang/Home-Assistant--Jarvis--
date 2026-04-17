# 🤖 Jarvis — Personal Home Assistant 1.0

> A self-hosted personal dashboard running on a **Raspberry Pi 5**, designed to centralize finances, investments, home monitoring and AI in a single interface. Built to grow over time with new hardware and software integrations.

---

## ✨ Current Features

### 🏠 Main Dashboard
- Real-time weather and clock
- Live Raspberry Pi stats (CPU temp, RAM, uptime)
- Pi camera snapshot
- Spotify widget (currently playing)
- Gesture-based navigation using your hand (MediaPipe)

### 💰 Personal Finance
- **Bank synchronization** via Salt Edge API (Raiffeisen Switzerland, Revolut, and 5000+ European banks)
- Transaction management with automatic categorization (income/expenses)
- Monthly budgets and savings tracking
- Reports and export (PDF, Excel)
- Multi-currency support

### 📈 Investments
- Search and track stocks, ETFs, crypto and other assets
- Price history and return calculation (%)
- Profit/loss calculation against invested capital
- Interactive charts with Recharts

### 🌡️ Environmental Sensors
- Real-time apartment temperature and humidity
- Support for **DHT22** (temp + humidity) and **DS18B20** (temp only) sensors
- Rolling average over the last N samples
- Data displayed directly on the main dashboard

### 📷 AI Camera
- Live MJPEG stream from the Pi camera (IMX500)
- Hand detection via **MediaPipe Hands**
- Periodic snapshots saved to Supabase
- Touchless navigation: count fingers (1–5) → navigate between screens

### 🤖 Offline AI
- Chat with a local LLM model (no cloud, no internet latency)
- Configurable local endpoint (`/api/offline-ai`)
- Jarvis-style chat interface

### 🖥️ System
- Remote Raspberry Pi stats via Supabase (Python bridge → cloud → frontend)
- Auto-refresh on all data
- Light/dark theme
- Optimized for touchscreen and mobile

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Raspberry Pi 5                           │
│                                                                 │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ pi-stats-service│  │ pi-camera-stream │  │gesture_control│  │
│  │ .py             │  │ .py (Flask:8081) │  │ .py (MediaPipe│  │
│  │ CPU/RAM/temp/   │  │ MJPEG + snapshot │  │ finger count) │  │
│  │ humidity        │  │                  │  │               │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                   │                     │          │
│           └───────────────────┴─────────────────────┘          │
│                               │                                │
│                    supabase_bridge.py                          │
│                               │                                │
└───────────────────────────────┼────────────────────────────────┘
                                ▼
                         ☁️ Supabase
                    (DB + Storage + Realtime)
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Next.js Dashboard   │
                    │   (localhost:3000)    │
                    │                       │
                    │  /api/pi-remote       │ ← reads Pi stats
                    │  /api/bank/*          │ ← Salt Edge
                    │  /api/market/*        │ ← asset prices
                    │  /api/spotify/*       │ ← music
                    │  /api/weather         │ ← weather
                    └───────────────────────┘
```

---

## 🛒 Hardware Shopping List

Everything you need to replicate the full setup:

### Core

| Component | Notes | Estimated Price |
|---|---|---|
| **Raspberry Pi 5 (8GB)** | Heart of the system. 8GB recommended for running local LLMs | ~90 CHF |
| **Official Pi 5 power supply (27W USB-C)** | Required for Pi 5 — generic chargers cause undervoltage warnings | ~15 CHF |
| **MicroSD ≥ 64GB (A2, UHS-I)** | OS and data storage. A2 class recommended for performance | ~15 CHF |
| **NVMe SSD (optional, via HAT)** | Faster and more reliable storage, especially with local databases | ~40 CHF |
| **Raspberry Pi NVMe HAT** | PCIe adapter for SSD on Pi 5 | ~20 CHF |
| **Case with active cooling** | Essential — the Pi 5 runs hot. Argon NEO 5 or Pimoroni recommended | ~20 CHF |

### Display (optional but recommended)

| Component | Notes | Estimated Price |
|---|---|---|
| **Official 7" Pi Touchscreen** | Perfect for the dashboard — plug & play | ~70 CHF |
| **10" HDMI Touchscreen** | More comfortable for navigation, requires HDMI cable | ~60–90 CHF |

### Environmental Sensors

| Component | Measures | Connection | Estimated Price |
|---|---|---|---|
| **DHT22** | Temperature + humidity | GPIO (data pin + 10kΩ pull-up) | ~5–8 CHF |
| **DS18B20** (alternative) | Temperature only | 1-Wire (GPIO, 4.7kΩ pull-up) | ~3–5 CHF |
| **10kΩ resistor** | Pull-up for DHT22 | — | <1 CHF |
| **Breadboard + jumper wires** | For connections | — | ~5 CHF |

> The project supports both DHT22 and DS18B20 — pick one. **DHT22 recommended** because it also measures humidity.

### AI Camera

| Component | Notes | Estimated Price |
|---|---|---|
| **Raspberry Pi Camera Module 3** | Standard, good quality, plug & play via ribbon cable | ~30 CHF |
| **Raspberry Pi AI Camera (IMX500)** | **Recommended** — has onboard NPU for local inference without loading the CPU | ~70 CHF |
| **USB Webcam** (budget alternative) | Any USB webcam works with OpenCV, less integration | ~20–40 CHF |
| **30cm ribbon cable** (if needed) | For mounting with a case or arm | ~3 CHF |

### Networking

| Component | Notes | Estimated Price |
|---|---|---|
| **Ethernet cable** | Recommended over WiFi for stability and latency | ~5 CHF |
| **MicroHDMI → HDMI adapter** | Pi 5 uses microHDMI ports | ~5 CHF |

### Estimated Total Cost
| Configuration | Price |
|---|---|
| **Minimum** (Pi 5 + SD + power supply + DHT22) | ~120–130 CHF |
| **Full setup** (Pi 5 + SSD + 7" display + IMX500 camera + sensors) | ~280–320 CHF |

---

## 🚀 Installation

### 1. Prerequisites

- Raspberry Pi OS (64-bit) installed on the Pi 5
- Node.js ≥ 18 on the Pi (or your PC for development)
- Python 3.11+ on the Pi
- [Supabase](https://supabase.com) account (free tier is sufficient)

### 2. Clone and install

```bash
git clone https://github.com/samuelemoungang/Home-Assistant--Jarvis--.git
cd Home-Assistant--Jarvis--
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Pi device ID
NEXT_PUBLIC_PI_DEVICE_ID=raspberry-pi

# Weather (OpenWeatherMap or similar)
NEXT_PUBLIC_WEATHER_API_KEY=your_key
NEXT_PUBLIC_WEATHER_LAT=46.23
NEXT_PUBLIC_WEATHER_LON=7.36

# Salt Edge — bank synchronization
NEXT_PUBLIC_SALT_EDGE_APP_ID=your_app_id
SALT_EDGE_SECRET=your_secret

# Financial markets (Twelve Data or similar)
NEXT_PUBLIC_MARKET_API_KEY=your_key

# Spotify (optional)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
```

### 4. Create Supabase tables

Run the SQL scripts in the Supabase console:

```bash
# Finance tables
scripts/001_create_finance_tables.sql

# Pi remote tables (stats, snapshots)
scripts/002_create_pi_remote_tables.sql
```

### 5. Start the Python services on the Pi

```bash
# Install Python dependencies
pip3 install adafruit-circuitpython-dht flask picamera2 mediapipe opencv-python supabase

# Start Pi stats bridge → Supabase
python3 scripts/pi-stats-service.py &

# Start camera stream
python3 scripts/pi-camera-stream.py &

# Start gesture detection (optional)
python3 scripts/gesture_control.py &
```

### 6. Start the dashboard

```bash
npm run dev
# or, for auto-start on boot:
bash scripts/start-dashboard.sh
```

Open `http://localhost:3000` (or the Pi's IP address from your local network).

---

## 📁 Project Structure

```
Home-Assistant--Jarvis--/
├── app/
│   ├── page.tsx                      # Entry point
│   ├── layout.tsx
│   └── api/
│       ├── bank/                     # Salt Edge: connect, sync, callback
│       ├── market/                   # Asset prices, FX, history
│       ├── spotify/                  # OAuth + now playing
│       ├── weather/                  # Weather data
│       └── pi-remote/               # Pi stats via Supabase
├── components/
│   ├── dashboard/
│   │   ├── home-screen.tsx          # Main screen
│   │   ├── weather-time.tsx         # Weather/clock widget
│   │   ├── spotify-now-playing.tsx  # Spotify widget
│   │   ├── chat-panel.tsx           # AI chat
│   │   └── glass-card.tsx           # Glassmorphism UI card
│   └── screens/
│       ├── finance-screen.tsx       # Finance overview
│       ├── investments-screen.tsx   # Investment tracker
│       ├── bank-sync-screen.tsx     # Bank sync
│       ├── budgets-screen.tsx       # Budgets
│       ├── savings-screen.tsx       # Savings goals
│       ├── reports-screen.tsx       # Reports & export
│       └── offline-ai-screen.tsx   # Local AI chat
├── scripts/
│   ├── pi-stats-service.py          # CPU/RAM/temp → Supabase
│   ├── env-sensor-monitor.py        # DHT22/DS18B20 sensor reader
│   ├── pi-camera-stream.py          # MJPEG stream + snapshots
│   ├── gesture_control.py           # MediaPipe finger counting
│   ├── gesture_bridge.py            # Gesture → dashboard bridge
│   ├── supabase_bridge.py           # Python Supabase helper
│   └── start-dashboard.sh           # Auto-start script
├── lib/
│   ├── salt-edge.ts                 # Salt Edge API client
│   ├── investments.ts               # Investment logic
│   ├── market-data.ts               # Market data fetching
│   ├── finance-context.tsx          # Finance React context
│   └── supabase/                    # Supabase client
└── hooks/
    ├── use-pi-stats.ts              # Pi stats hook
    └── use-gesture-control.ts       # Gesture control hook
```

---

## 🗺️ Roadmap — Planned Features

### 🔜 Next up
- [ ] **Push notifications** — budget threshold alerts, portfolio changes, abnormal temperature
- [ ] **Context-aware AI** — local LLM with access to your personal finance and sensor data
- [ ] **Calendar integration** (Google Calendar / CalDAV)
- [ ] **Home automation** — smart lights and plugs via MQTT/Home Assistant

### 🏠 Home Automation
- [ ] **Home Assistant** backend integration for IoT
- [ ] **Smart lights** control (Philips Hue, IKEA Tradfri)
- [ ] **Smart plugs** support (Shelly, TP-Link Tapo)
- [ ] **Door/window sensors** (open/closed state)
- [ ] Simple **alarm system** with smartphone notifications

### 📷 AI Camera
- [ ] Real-time **object detection** with IMX500 (people, animals, objects)
- [ ] **Face recognition** for automatic dashboard login
- [ ] **Motion detection** with phone alerts
- [ ] Snapshot history with timeline view
- [ ] Multi-camera support (Pi Camera + external USB webcams)

### 💰 Advanced Finance
- [ ] **Predictive spending analysis** (AI on transaction categories)
- [ ] Real-time **budget alerts**
- [ ] **Savings goals** with progress tracking
- [ ] **Broker integration** (IBKR or similar) for real portfolio data
- [ ] Live **CHF/EUR/USD exchange rates** in the dashboard

### 🌡️ Sensors & Environment
- [ ] **Air quality** monitoring (CO2, VOC — SCD40 or SGP30 sensor)
- [ ] **Atmospheric pressure** (BME280)
- [ ] **Ambient light** sensor for auto-dimming the display
- [ ] Historical sensor data with weekly/monthly charts

### 🤖 AI & Automation
- [ ] Local **voice assistant** (Whisper + offline TTS)
- [ ] **Automated routines** (e.g. "when I get home" → turn on lights, show weather)
- [ ] AI-generated **daily briefing** every morning
- [ ] **n8n** or **Node-RED** integration for no-code automations

### 📱 Mobile & Remote Access
- [ ] Installable **PWA** for iPhone/Android
- [ ] Secure **remote access** via WireGuard VPN
- [ ] Home screen widgets for iOS/Android

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **UI Components** | shadcn/ui, Radix UI, Recharts |
| **Database** | Supabase (PostgreSQL + Storage + Realtime) |
| **Pi Sensors** | Python, adafruit-dht, picamera2 |
| **Gesture AI** | MediaPipe Hands, OpenCV |
| **Banking** | Salt Edge API v5 |
| **Market Data** | Twelve Data / Yahoo Finance |
| **Music** | Spotify Web API |
| **Export** | jsPDF, ExcelJS |

---

## ⚠️ Security Notes

- **Do not expose the dashboard to the internet** without authentication — use WireGuard VPN for remote access
- Never commit `.env` or `.env.local` to Git (already in `.gitignore`)
- Salt Edge keys have read access to your bank accounts — keep them private
- The Supabase `SERVICE_ROLE_KEY` bypasses RLS — use it server-side only

---

## 📄 License

Personal private project. All rights reserved.

---
