# Troubleshooting accesso remoto Pi stats + camera snapshot

Questa guida aiuta quando la dashboard "su Internet" non mostra dati `pi_runtime_status` e `pi_camera_snapshots`.

## 1) Cause più comuni

1. **`device_id` non allineato**
   - Frontend filtra con `NEXT_PUBLIC_PI_DEVICE_ID` (default: `raspberry-pi`).
   - I servizi Python scrivono con `PI_DEVICE_ID` (default: `raspberry-pi`).
   - Se sono diversi, la query torna vuota.
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
   - `PI_DEVICE_ID` **non è magico**: scegli una stringa stabile (es. `raspberry-pi-salone`) e usa lo stesso valore anche in `NEXT_PUBLIC_PI_DEVICE_ID`.
>>>>>>> theirs
=======
   - `PI_DEVICE_ID` **non è magico**: scegli una stringa stabile (es. `raspberry-pi-salone`) e usa lo stesso valore anche in `NEXT_PUBLIC_PI_DEVICE_ID`.
>>>>>>> theirs
=======
   - `PI_DEVICE_ID` **non è magico**: scegli una stringa stabile (es. `raspberry-pi-salone`) e usa lo stesso valore anche in `NEXT_PUBLIC_PI_DEVICE_ID`.
>>>>>>> theirs
=======
   - `PI_DEVICE_ID` **non è magico**: scegli una stringa stabile (es. `raspberry-pi-salone`) e usa lo stesso valore anche in `NEXT_PUBLIC_PI_DEVICE_ID`.
>>>>>>> theirs

2. **Env Supabase mancanti lato frontend**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Env Supabase mancanti lato Raspberry Pi**
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - opzionale ma importante: `PI_DEVICE_ID`

4. **Dati considerati "stale"**
   - runtime oltre 60s
   - snapshot oltre 30s

5. **Il frontend tenta solo localhost**
   - Ora il frontend usa `NEXT_PUBLIC_PI_STATS_URL` (default `http://localhost:8080`).
   - Per deploy internet puoi lasciarlo vuoto per forzare fallback remoto via Supabase.

## 2) Checklist veloce

### Frontend (deploy internet)

Imposta:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_PI_DEVICE_ID` (uguale al Pi)
- `NEXT_PUBLIC_PI_STATS_URL` = stringa vuota se non vuoi tentativi localhost

### Raspberry Pi

Esporta variabili prima di avviare i servizi:

```bash
export SUPABASE_URL="https://<project>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
export PI_DEVICE_ID="raspberry-pi"
```

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
> Se non sai che valore usare: controlla il `device_id` già presente nelle tabelle Supabase e riusa quello.
>
> Dove configurarlo in pratica:
> - sviluppo/manuale: file `.env` nella root del repo (lo script `test-pi-remote-10min.sh` lo carica automaticamente),
> - produzione su Pi: service manager (`systemd`) con `Environment=PI_DEVICE_ID=...`.
>
> Attenzione: sul Pi devi usare la variabile `PI_DEVICE_ID` (senza `NEXT_PUBLIC_`).
> Lo script di test usa questo ordine di fallback: `DEVICE_ID` -> `PI_DEVICE_ID` -> `NEXT_PUBLIC_PI_DEVICE_ID` -> hostname.

### Frontend web (Vercel o altro)

Nel pannello env del deploy imposta:

- `NEXT_PUBLIC_PI_DEVICE_ID=<stesso valore di PI_DEVICE_ID sul Pi>`

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
E avvia:

```bash
python3 scripts/pi-stats-service.py
python3 scripts/pi-camera-stream.py
```

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
=======
Dopo ogni modifica al file `.env`, riavvia i processi Python (`pi-stats-service.py` e `pi-camera-stream.py`) per applicare subito i nuovi valori.

>>>>>>> theirs
=======
Dopo ogni modifica al file `.env`, riavvia i processi Python (`pi-stats-service.py` e `pi-camera-stream.py`) per applicare subito i nuovi valori.

>>>>>>> theirs
=======
Dopo ogni modifica al file `.env`, riavvia i processi Python (`pi-stats-service.py` e `pi-camera-stream.py`) per applicare subito i nuovi valori.

>>>>>>> theirs
=======
Dopo ogni modifica al file `.env`, riavvia i processi Python (`pi-stats-service.py` e `pi-camera-stream.py`) per applicare subito i nuovi valori.

>>>>>>> theirs
## 3) Test consigliati (end-to-end)

Se vuoi una procedura rapida guidata, usa anche:

```bash
bash scripts/test-pi-remote-10min.sh
```

Lo script verifica API locale, variabili env, righe in Supabase, freshness e checklist deploy web.

### A. Verifica API locale sul Pi

```bash
curl -s http://127.0.0.1:8080/api/health
curl -s http://127.0.0.1:8080/api/stats
curl -s http://127.0.0.1:8080/api/sensors
```

### B. Verifica scrittura su Supabase dal Pi

Controlla log:

- nessun `Supabase runtime status publish failed`
- nessun `Supabase camera snapshot publish failed`

### C. Verifica dati presenti in Supabase

```sql
select device_id, source_updated_at, updated_at
from public.pi_runtime_status
order by updated_at desc;

select device_id, source_updated_at, updated_at, length(image_base64) as b64_len
from public.pi_camera_snapshots
order by updated_at desc;
```

### D. Verifica lettura da frontend

Apri DevTools -> Network:

- query su `pi_runtime_status` e `pi_camera_snapshots` con 200 OK
- verifica che `device_id` filtrato sia quello corretto

## 4) Serve un reverse proxy?

**Non è obbligatorio** se usi Supabase come bridge remoto (Pi scrive, frontend legge).

È utile invece se vuoi:

- vedere stream live MJPEG diretto (`:8081`) da internet,
- esporre endpoint locali Pi (`:8080`, `:8082`) in modo sicuro,
- gestire TLS + auth + rate limit.

In quel caso usa Nginx/Caddy/Traefik davanti ai servizi Pi e proteggi gli endpoint.
