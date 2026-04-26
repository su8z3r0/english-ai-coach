# English AI Coach

App per allenare ascolto e parlato in inglese generale, con esercizi interattivi guidati dall'AI.

## Funzionalità

- **Shadowing**: ascolta una frase e ripetila. Confronta la tua pronuncia con l'originale tramite similarità testuale.
- **Role Play**: simula conversazioni reali (ristorante, aeroporto, colloquio...) con risposte generate da AI.
- **TTS integrato**: il browser legge ad alta voce frasi e risposte.
- **Progressi**: storico esercizi e streak giornaliera salvati in IndexedDB.

## Architecture

```
┌─────────────────┐
│  Browser (Vue)  │
│  TTS, Recorder  │
└────────┬────────┘
         │ HTTP
         v
┌─────────────────┐
│ english-coach-api│  (porta 3002)
│  Proxy OpenAI    │
│  Whisper + GPT   │
└─────────────────┘
```

Il frontend NON contiene mai la chiave API OpenAI. Tutte le chiamate passano attraverso il backend proxy.

## Tech Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS
- Web Speech API (TTS + fallback STT)
- OpenAI Whisper + GPT-4o-mini (via backend proxy)
- IndexedDB (progressi locali)

## Setup

### 1. Avvia il backend proxy

```bash
cd formazione2026/
cp english-coach/api/.env.example .env
# Modifica .env e inserisci OPENAI_API_KEY=sk-tua-chiave
docker-compose up english-coach-api
```

### 2. Avvia il frontend

```bash
cd english-coach
npm install
npm run dev
```

Apri http://localhost:5174

### 3. Avvia tutto insieme (opzionale)

```bash
cd formazione2026/
docker-compose up
```

## Variabili d'ambiente

| Variabile | Descrizione |
|-----------|-------------|
| `OPENAI_API_KEY` | Chiave API OpenAI (obbligatoria per trascrizione e chat) |
| `PORT` | Porta del server (default: 3002) |

## Livelli

- **A1, A2, B1, B2**: inglese generale
- **tech**: inglese tecnico (in arrivo)
