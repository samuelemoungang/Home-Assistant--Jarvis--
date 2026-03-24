# Troubleshooting accesso remoto Pi stats + camera snapshot

Questa guida aiuta quando la dashboard pubblicata su Internet non mostra i dati di `pi_runtime_status` e `pi_camera_snapshots`.

## 1) Cause piu comuni

1. **`device_id` non allineato**
   - Il frontend filtra con `NEXT_PUBLIC_PI_DEVICE_ID` (default: `raspberry-pi`).
   - I servizi Python scrivono con `PI_DEVICE_ID` (default: `raspberry-pi`).
   - Se i due valori sono diversi, la query su Supabase torna vuota.
   - `PI_DEVICE_ID` non e magico: scegli una stringa stabile, ad esempio `raspberry-pi-salone`, e usa lo stesso valore anche in `NEXT_PUBLIC_PI_DEVICE_ID`.

2. **Env Supabase mancanti lato frontend**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Env Supabase mancanti lato Raspberry Pi**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PI_DEVICE_ID`

4. **Dati considerati stale**
   - `pi_runtime_status` oltre 60 secondi
   - `pi_camera_snapshots` oltre 30 secondi

5. **Il frontend prova `localhost`**
   - Il frontend usa `NEXT_PUBLIC_PI_STATS_URL` (default: `http://localhost:8080`).
   - In un deploy Internet conviene lasciarlo vuoto per saltare subito al fallback remoto via Supabase.

## 2) Checklist veloce

### Frontend web

Nel deploy imposta:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PI_DEVICE_ID`
- `NEXT_PUBLIC_PI_STATS_URL=` come stringa vuota se non vuoi tentativi verso `localhost`

### Raspberry Pi

Esporta le variabili prima di avviare i servizi:

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
export PI_DEVICE_ID="raspberry-pi"
```

Se non sai che valore usare per `PI_DEVICE_ID`, controlla il `device_id` gia presente nelle tabelle Supabase e riusa quello.

Dove configurarlo in pratica:

- sviluppo manuale: file `.env` nella root del repo
- produzione sul Pi: servizio `systemd` con `Environment=PI_DEVICE_ID=...`

Attenzione: sul Pi devi usare `PI_DEVICE_ID`, non `NEXT_PUBLIC_PI_DEVICE_ID`.

## 3) Avvio servizi

Sul Raspberry Pi avvia:

```bash
python3 scripts/pi-stats-service.py
python3 scripts/pi-camera-stream.py
```

Dopo ogni modifica al file `.env`, riavvia i processi Python per applicare subito i nuovi valori.

## 4) Test consigliati

Per una verifica guidata puoi usare:

```bash
bash scripts/test-pi-remote-10min.sh
```

Lo script controlla:

- API locale del Pi
- variabili env
- righe presenti in Supabase
- freshness dei dati
- configurazione attesa del deploy web

### Endpoint diagnostico del sito

Sul sito online ora puoi aprire anche:

```text
/api/pi-remote
```

L'endpoint restituisce JSON con:

- `deviceId` che il sito sta cercando
- `reason` del problema, ad esempio `missing_runtime`, `stale_runtime` o `missing_env`
- `diagnostics.runtime.ageSeconds`
- `diagnostics.snapshot.ageSeconds`
- `diagnostics.hints` con suggerimenti pratici

Se questo endpoint risponde con `ok: true`, allora il problema non e Supabase ma il rendering della UI.

### A. Verifica API locale sul Pi

```bash
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8080/api/stats
curl -s http://127.0.0.1:8080/api/sensors
```

### B. Verifica scrittura su Supabase dal Pi

Controlla i log e verifica che non compaiano:

- `Supabase runtime status publish failed`
- `Supabase camera snapshot publish failed`

### C. Verifica dati presenti in Supabase

```sql
select device_id, source_updated_at, updated_at
from public.pi_runtime_status
order by updated_at desc;

select device_id, source_updated_at, updated_at, length(image_base64) as b64_len
from public.pi_camera_snapshots
order by updated_at desc;
```

### D. Verifica lettura dal frontend

Apri DevTools -> Network e controlla:

- query verso `pi_runtime_status` e `pi_camera_snapshots` con `200 OK`
- `device_id` filtrato uguale a quello usato dal Pi

## 5) Serve un reverse proxy?

Non e obbligatorio se usi Supabase come bridge remoto: il Pi scrive e il frontend legge.

Serve invece se vuoi:

- stream MJPEG live diretto da `:8081` su Internet
- esporre endpoint locali del Pi come `:8080` o `:8082`
- aggiungere TLS, auth o rate limit

In quel caso puoi usare Nginx, Caddy o Traefik davanti ai servizi del Pi.
