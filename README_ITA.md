# 🤖 Jarvis — Personal Home Assistant

> Un dashboard personale self-hosted che gira su **Raspberry Pi 5**, progettato per centralizzare finanze, investimenti, domotica e AI in un'unica interfaccia. Pensato per crescere nel tempo con nuove integrazioni hardware e software.

---

## ✨ Funzionalità attuali

### 🏠 Dashboard principale
- Meteo e ora in tempo reale
- Statistiche live del Raspberry Pi (CPU temp, RAM, uptime)
- Snapshot dalla camera del Pi
- Widget Spotify (canzone in riproduzione)
- Navigazione gesture-based con la mano (MediaPipe)

### 💰 Finanze personali
- **Sincronizzazione bancaria** tramite Salt Edge API (Raiffeisen Svizzera, Revolut, e +5000 banche europee)
- Gestione transazioni, entrate/uscite con categorizzazione automatica
- Budget mensili e tracking savings
- Report e export (PDF, Excel)
- Supporto multi-valuta

### 📈 Investimenti
- Ricerca e tracciamento di azioni, ETF, crypto e altri asset
- Storico prezzi e calcolo rendimento (%)
- Calcolo profit/loss rispetto al capitale investito
- Grafici interattivi con Recharts

### 🌡️ Sensori ambientali
- Temperatura e umidità dell'appartamento in tempo reale
- Supporto sensori **DHT22** (temp + umidità) e **DS18B20** (solo temp)
- Media rolling degli ultimi N campioni
- Dati visibili nel dashboard principale

### 📷 Camera con AI
- Stream MJPEG live dalla camera del Pi (IMX500)
- Rilevamento mani via **MediaPipe Hands**
- Snapshot periodici salvati su Supabase
- Navigazione touchless: conta le dita (1–5) → naviga tra le schermate

### 🤖 Offline AI
- Chat con un modello LLM locale (senza cloud, senza latenza internet)
- Endpoint locale configurabile (`/api/offline-ai`)
- Interfaccia chat stile Jarvis

### 🖥️ Sistema
- Statistiche Raspberry Pi remote via Supabase (bridge Python → cloud → frontend)
- Auto-refresh dei dati
- Tema chiaro/scuro
- Interfaccia ottimizzata per touchscreen e mobile

---

## 🏗️ Architettura

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
                    │  /api/pi-remote       │ ← legge stats Pi
                    │  /api/bank/*          │ ← Salt Edge
                    │  /api/market/*        │ ← prezzi asset
                    │  /api/spotify/*       │ ← musica
                    │  /api/weather         │ ← meteo
                    └───────────────────────┘
```

---

## 🛒 Lista materiali hardware

Tutto quello che serve per replicare il setup completo:

### Core

| Componente | Descrizione | Prezzo indicativo |
|---|---|---|
| **Raspberry Pi 5 (8GB)** | Cuore del sistema. La versione 8GB è consigliata per far girare LLM locali | ~90 CHF |
| **Alimentatore ufficiale Pi 5 (27W USB-C)** | Obbligatorio per il Pi 5 — alimentatori generici causano undervoltage | ~15 CHF |
| **MicroSD ≥ 64GB (A2, UHS-I)** | Sistema operativo e dati. Classe A2 consigliata per le performance | ~15 CHF |
| **SSD NVMe (opzionale, via HAT)** | Per storage più veloce e affidabile, specialmente con database locali | ~40 CHF |
| **Raspberry Pi NVMe HAT** | Adattatore PCIe per SSD sul Pi 5 | ~20 CHF |
| **Case con dissipatore attivo** | Essenziale — il Pi 5 scalda molto. Consigliato Argon NEO 5 o Pimoroni | ~20 CHF |

### Display (opzionale ma consigliato)

| Componente | Note | Prezzo indicativo |
|---|---|---|
| **Touchscreen 7" ufficiale Pi** | Perfetto per il dashboard — plug & play | ~70 CHF |
| **Touchscreen 10" HDMI** | Più comodo per la navigazione, serve cavo HDMI | ~60–90 CHF |

### Sensori ambientali

| Componente | Misura | Connessione | Prezzo indicativo |
|---|---|---|---|
| **DHT22** | Temperatura + umidità | GPIO (data pin + 10kΩ pull-up) | ~5–8 CHF |
| **DS18B20** (alternativa) | Solo temperatura | 1-Wire (GPIO, 4.7kΩ pull-up) | ~3–5 CHF |
| **Resistenza 10kΩ** | Pull-up per DHT22 | — | <1 CHF |
| **Breadboard + jumper wire** | Per il collegamento | — | ~5 CHF |

> Il progetto supporta sia DHT22 che DS18B20 — scegli uno dei due. **DHT22 consigliato** perché misura anche l'umidità.

### Camera AI

| Componente | Note | Prezzo indicativo |
|---|---|---|
| **Raspberry Pi Camera Module 3** | Standard, buona qualità, plug & play via ribbon cable | ~30 CHF |
| **Raspberry Pi AI Camera (IMX500)** | **Consigliato** — ha NPU integrato per inferenza locale senza caricare CPU | ~70 CHF |
| **Webcam USB** (alternativa economica) | Qualsiasi webcam USB funziona con OpenCV, meno integrazione | ~20–40 CHF |
| **Ribbon cable 30cm** (se serve) | Per montaggio con case o arm | ~3 CHF |

### Networking

| Componente | Note | Prezzo indicativo |
|---|---|---|
| **Cavo Ethernet** | Consigliato rispetto al WiFi per stabilità e latenza | ~5 CHF |
| **MicroHDMI → HDMI adapter** | Il Pi 5 ha porta microHDMI | ~5 CHF |

### Totale stimato setup base
| Configurazione | Prezzo |
|---|---|
| **Minimo** (Pi 5 + SD + alimentatore + DHT22) | ~120–130 CHF |
| **Completo** (Pi 5 + SSD + display 7" + camera IMX500 + sensori) | ~280–320 CHF |

---

## 🚀 Installazione

### 1. Prerequisiti

- Raspberry Pi OS (64-bit) installato sul Pi 5
- Node.js ≥ 18 sul Pi (o sul tuo PC per lo sviluppo)
- Python 3.11+ sul Pi
- Account [Supabase](https://supabase.com) (free tier sufficiente)

### 2. Clona e installa

```bash
git clone https://github.com/samuelemoungang/Home-Assistant--Jarvis--.git
cd Home-Assistant--Jarvis--
npm install
```

### 3. Configura le variabili d'ambiente

Crea un file `.env.local` nella root:

```env
# Supabase (obbligatorio)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Pi device ID
NEXT_PUBLIC_PI_DEVICE_ID=raspberry-pi

# Meteo (OpenWeatherMap o simile)
NEXT_PUBLIC_WEATHER_API_KEY=your_key
NEXT_PUBLIC_WEATHER_LAT=46.23
NEXT_PUBLIC_WEATHER_LON=7.36

# Salt Edge — sincronizzazione bancaria
NEXT_PUBLIC_SALT_EDGE_APP_ID=your_app_id
SALT_EDGE_SECRET=your_secret

# Mercati finanziari (Twelve Data o simile)
NEXT_PUBLIC_MARKET_API_KEY=your_key

# Spotify (opzionale)
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:3000/api/spotify/callback
```

### 4. Crea le tabelle Supabase

Esegui gli script SQL nella console Supabase:

```bash
# Tabelle finanza
scripts/001_create_finance_tables.sql

# Tabelle Pi remote (stats, snapshot)
scripts/002_create_pi_remote_tables.sql
```

### 5. Avvia i servizi Python sul Pi

```bash
# Installa dipendenze Python
pip3 install adafruit-circuitpython-dht flask picamera2 mediapipe opencv-python supabase

# Avvia il bridge statistiche Pi → Supabase
python3 scripts/pi-stats-service.py &

# Avvia lo stream camera
python3 scripts/pi-camera-stream.py &

# Avvia il rilevamento gesture (opzionale)
python3 scripts/gesture_control.py &
```

### 6. Avvia il dashboard

```bash
npm run dev
# oppure, per avvio automatico al boot:
bash scripts/start-dashboard.sh
```

Apri `http://localhost:3000` (o l'IP del Pi dalla rete locale).

---

## 📁 Struttura del progetto

```
Home-Assistant--Jarvis--/
├── app/
│   ├── page.tsx                      # Entry point
│   ├── layout.tsx
│   └── api/
│       ├── bank/                     # Salt Edge: connect, sync, callback
│       ├── market/                   # Prezzi asset, FX, storico
│       ├── spotify/                  # OAuth + now playing
│       ├── weather/                  # Meteo
│       └── pi-remote/               # Stats Pi via Supabase
├── components/
│   ├── dashboard/
│   │   ├── home-screen.tsx          # Schermata principale
│   │   ├── weather-time.tsx         # Widget meteo/ora
│   │   ├── spotify-now-playing.tsx  # Widget Spotify
│   │   ├── chat-panel.tsx           # Chat AI
│   │   └── glass-card.tsx           # UI card glassmorphism
│   └── screens/
│       ├── finance-screen.tsx       # Finanze
│       ├── investments-screen.tsx   # Investimenti
│       ├── bank-sync-screen.tsx     # Sync banca
│       ├── budgets-screen.tsx       # Budget
│       ├── savings-screen.tsx       # Risparmi
│       ├── reports-screen.tsx       # Report/export
│       └── offline-ai-screen.tsx   # Chat AI locale
├── scripts/
│   ├── pi-stats-service.py          # CPU/RAM/temp → Supabase
│   ├── env-sensor-monitor.py        # DHT22/DS18B20 → lettura sensori
│   ├── pi-camera-stream.py          # MJPEG stream + snapshot
│   ├── gesture_control.py           # MediaPipe finger counting
│   ├── gesture_bridge.py            # Bridge gesture → dashboard
│   ├── supabase_bridge.py           # Helper Supabase per Python
│   └── start-dashboard.sh           # Script avvio automatico
├── lib/
│   ├── salt-edge.ts                 # Client Salt Edge API
│   ├── investments.ts               # Logica investimenti
│   ├── market-data.ts               # Dati mercato
│   ├── finance-context.tsx          # React context finanze
│   └── supabase/                    # Client Supabase
└── hooks/
    ├── use-pi-stats.ts              # Hook statistiche Pi
    └── use-gesture-control.ts       # Hook controllo gesture
```

---

## 🗺️ Roadmap — Funzionalità future

### 🔜 Prossimo step
- [ ] **Notifiche push** — alert soglie budget, variazioni portfolio, temperatura anomala
- [ ] **AI integrata con contesto personale** — il LLM locale conosce le tue finanze e i tuoi dati sensore
- [ ] **Integrazione calendario** (Google Calendar / CalDAV)
- [ ] **Home automation** — controllo luci, prese smart via MQTT/Home Assistant

### 🏠 Domotica
- [ ] Integrazione **Home Assistant** come backend IoT
- [ ] Controllo **luci smart** (Philips Hue, IKEA Tradfri)
- [ ] Supporto **prese smart** (Shelly, TP-Link Tapo)
- [ ] Sensori **porta/finestra** (aperto/chiuso)
- [ ] **Allarme** semplice con notifiche

### 📷 AI Camera
- [ ] **Object detection** in tempo reale con IMX500 (persone, animali, oggetti)
- [ ] **Riconoscimento facciale** per accesso automatico al dashboard
- [ ] **Motion detection** con alert su smartphone
- [ ] Storico snapshot con timeline
- [ ] Multi-camera (Pi Camera + webcam esterne)

### 💰 Finanze avanzate
- [ ] **Analisi predittiva** delle spese (AI sulle categorie)
- [ ] **Alert budget** in tempo reale
- [ ] **Obiettivi di risparmio** con progress tracker
- [ ] Integrazione **IBKR / broker** per portfolio reale
- [ ] **Tasso di cambio** CHF/EUR/USD live nel dashboard

### 🌡️ Sensori & ambiente
- [ ] **Qualità dell'aria** (CO2, VOC — sensore SCD40 o SGP30)
- [ ] **Pressione atmosferica** (BME280)
- [ ] **Luminosità** ambientale per auto-dim del display
- [ ] Dashboard storico con grafici su settimane/mesi

### 🤖 AI & automazione
- [ ] **Voice assistant** locale (Whisper + TTS offline)
- [ ] **Routine automatiche** (es: "quando torno a casa" → accendi luci, mostra meteo)
- [ ] **Riepilogo giornaliero** AI generato ogni mattina
- [ ] Integrazione **n8n** o **Node-RED** per automazioni no-code

### 📱 Mobile & accesso remoto
- [ ] **PWA** installabile su iPhone/Android
- [ ] **Accesso remoto sicuro** via WireGuard VPN (già configurato)
- [ ] Widget per schermata home iOS/Android

---

## 🔧 Tech Stack

| Layer | Tecnologia |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| **UI Components** | shadcn/ui, Radix UI, Recharts |
| **Database** | Supabase (PostgreSQL + Storage + Realtime) |
| **Sensori Pi** | Python, adafruit-dht, picamera2 |
| **Gesture AI** | MediaPipe Hands, OpenCV |
| **Banking** | Salt Edge API v5 |
| **Market data** | Twelve Data / Yahoo Finance |
| **Musica** | Spotify Web API |
| **Export** | jsPDF, ExcelJS |

---

## ⚠️ Note di sicurezza

- **Non esporre il dashboard su internet** senza autenticazione — usa WireGuard VPN per accesso remoto
- Non committare `.env` o `.env.local` su Git (già nel `.gitignore`)
- Le chiavi Salt Edge hanno accesso in lettura ai tuoi conti — tienile riservate
- Il Supabase `SERVICE_ROLE_KEY` bypassa le RLS — usarlo solo lato server

---

## 📄 Licenza

Progetto personale privato. Tutti i diritti riservati.

---

*Self-hosted con ❤️ in Valais, Switzerland.*
