# English AI Coach

App per allenare ascolto e parlato in inglese generale, con esercizi interattivi guidati dall'AI.

## Funzionalità

- **Shadowing**: ascolta una frase e ripetila. Confronta la tua pronuncia con l'originale tramite similarità testuale.
- **Role Play**: simula conversazioni reali (ristorante, aeroporto, colloquio...) con risposte generate da AI.
- **TTS integrato**: il browser legge ad alta voce frasi e risposte.
- **Progressi**: storico esercizi e streak giornaliera salvati in IndexedDB.

## Tech Stack

- Vue 3 + TypeScript + Vite
- Tailwind CSS
- Web Speech API (TTS)
- OpenAI GPT-4o-mini (role-play, opzionale)
- OpenAI Whisper API (trascrizione, opzionale)
- IndexedDB (progressi locali)

## Setup

```bash
cd english-coach
npm install
npm run dev
```

Apri http://localhost:5173

## API Key OpenAI (opzionale)

Per usare il Role Play con AI e la trascrizione Whisper:
1. Ottieni una API key su [platform.openai.com](https://platform.openai.com)
2. Inseriscila nelle impostazioni dell'app (da aggiungere)

Costo stimato: ~3-8$/mese per uso regolare.

## Livelli

- A1, A2, B1, B2: inglese generale
- tech: inglese tecnico (in arrivo)
