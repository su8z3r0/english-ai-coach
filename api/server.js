const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PORT = process.env.PORT || 3002;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const OLLAMA_URL = process.env.OLLAMA_URL; // es. http://host.docker.internal:11434

// Seleziona provider LLM in base alla config
function getLLMProvider() {
  if (OPENAI_KEY) return { name: 'openai', key: OPENAI_KEY, model: 'gpt-4o-mini' };
  if (GROQ_KEY) return { name: 'groq', key: GROQ_KEY, model: 'llama-3.3-70b-versatile' };
  if (GEMINI_KEY) return { name: 'gemini', key: GEMINI_KEY, model: 'gemini-1.5-flash' };
  if (OLLAMA_URL) return { name: 'ollama', url: OLLAMA_URL, model: process.env.OLLAMA_MODEL || 'llama3.2' };
  return null;
}

const llm = getLLMProvider();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    whisper: !!OPENAI_KEY,
    chat: !!llm,
    provider: llm?.name || 'none'
  });
});

// ============== WHISPER (STT) ==============
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(503).json({ error: 'OpenAI API key non configurata' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file audio' });
  }

  try {
    const { FormData: FD, default: fetch } = await import('node-fetch');

    const form = new FD();
    form.append('file', Readable.from([req.file.buffer]), { filename: 'audio.webm', contentType: 'audio/webm' });
    form.append('model', 'whisper-1');
    form.append('language', 'en');

    const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_KEY}` },
      body: form,
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error?.message || 'Whisper error' });
    }
    res.json({ text: data.text || '' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== LLM HELPERS ==============
async function callOpenAICompatible({ url, key, model, messages, temperature = 0.8, maxTokens = 400, jsonMode = false }) {
  const { default: fetch } = await import('node-fetch');
  const body = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content?.trim() || '{}';
}

async function callGemini({ key, model, messages, temperature = 0.8 }) {
  const { default: fetch } = await import('node-fetch');
  // Converti messaggi OpenAI-style in formato Gemini
  const parts = [];
  for (const m of messages) {
    parts.push({ role: m.role === 'user' ? 'user' : 'model', text: m.content });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature, maxOutputTokens: 400 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
}

async function callOllama({ url, model, messages, temperature = 0.8 }) {
  const { default: fetch } = await import('node-fetch');
  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.message?.content?.trim() || '{}';
}

async function callLLM({ messages, temperature = 0.8, maxTokens = 400, jsonMode = false }) {
  if (!llm) throw new Error('Nessun provider LLM configurato');

  if (llm.name === 'openai') {
    return callOpenAICompatible({
      url: 'https://api.openai.com/v1/chat/completions',
      key: llm.key, model: llm.model, messages, temperature, maxTokens, jsonMode
    });
  }
  if (llm.name === 'groq') {
    return callOpenAICompatible({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: llm.key, model: llm.model, messages, temperature, maxTokens, jsonMode
    });
  }
  if (llm.name === 'gemini') {
    return callGemini({ key: llm.key, model: llm.model, messages, temperature });
  }
  if (llm.name === 'ollama') {
    return callOllama({ url: llm.url, model: llm.model, messages, temperature });
  }
  throw new Error('Provider LLM non supportato');
}

// ============== CONVERSATION (TUTOR) ==============
// Simple in-memory response cache (TTL 5 min)
const responseCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;
const crypto = require('crypto');

function getCacheKey(messages) {
  return crypto.createHash('md5').update(JSON.stringify(messages)).digest('hex');
}

function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache) {
    if (now - entry.ts > CACHE_TTL_MS) responseCache.delete(key);
  }
}

setInterval(cleanCache, 60 * 1000);

const SYSTEM_PROMPT_TUTOR = `You are a patient, friendly English tutor. The user is learning English.

CRITICAL RULE — YOU MUST ALWAYS REPLY IN ENGLISH ONLY. Never use Italian, Spanish, or any other language. The only exception is 1-2 Italian words inside grammar corrections.
Keep a natural, conversational tone.

When the user makes a mistake, include a correction in this JSON format at the END of your message:

---CORRECTION---
{"original":"user sentence","corrected":"correct sentence","issues":["type: description"],"severity":"minor|major"}
---END---

Use severity "major" only for errors that prevent understanding. Use "minor" for small mistakes.
Do not correct every tiny thing — let the conversation flow naturally.`;

app.post('/api/conversation', async (req, res) => {
  if (!llm) return res.status(503).json({ error: 'Nessun provider LLM configurato' });

  const { messages, level = 'A1', context = '' } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages deve essere un array' });

  // Cache hit per richieste identiche
  const cacheKey = getCacheKey(messages);
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    console.log('[Cache] HIT');
    return res.json({ reply: cached.reply, correction: cached.correction });
  }

  try {
    let systemMsg = SYSTEM_PROMPT_TUTOR;
    if (context) {
      systemMsg += '\n\nMEMORY CONTEXT: ' + context;
    }
    systemMsg += ` The user's current English level is ${level}. Adapt your English complexity accordingly.`;
    const fullMessages = [
      { role: 'system', content: systemMsg },
      ...messages
    ];

    const raw = await callLLM({ messages: fullMessages, temperature: 0.8, maxTokens: 500 });

    // Estrai correzione JSON se presente
    let reply = raw;
    let correction = null;
    const match = raw.match(/---CORRECTION---\s*({.*?})\s*---END---/s);
    if (match) {
      try {
        correction = JSON.parse(match[1]);
        reply = raw.replace(match[0], '').trim();
      } catch {
        // ignora JSON malformato
      }
    }

    responseCache.set(cacheKey, { reply, correction, ts: Date.now() });
    res.json({ reply, correction });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== EVALUATION ==============
const SYSTEM_PROMPT_EVAL = `Sei un valutatore di inglese. Valuta la frase dell'utente e restituisci SOLO un oggetto JSON con questo schema:
{
  "fluencyScore": 0-100,
  "grammarIssues": [{"issue":"descrizione errore","suggestion":"come correggere"}],
  "vocabularyScore": 0-100,
  "pronunciationNotes": "nota breve sulla pronuncia (basata sulla trascrizione)",
  "levelEstimate": "A1|A2|B1|B2|C1|C2",
  "encouragement": "frase motivazionale in italiano"
}

Sii onesto ma incoraggiante.`;

app.post('/api/evaluate', async (req, res) => {
  if (!llm) return res.status(503).json({ error: 'Nessun provider LLM configurato' });

  const { text, context } = req.body;
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text obbligatorio' });

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_EVAL },
      { role: 'user', content: `Frase da valutare: "${text}"${context ? `\nContesto: ${context}` : ''}` }
    ];

    const raw = await callLLM({ messages, temperature: 0.3, maxTokens: 400, jsonMode: true });

    // Tenta di parsare JSON
    let evaluation;
    try {
      evaluation = JSON.parse(raw);
    } catch {
      // Fallback: estrai JSON da markdown code block
      const codeMatch = raw.match(/```json\s*([\s\S]*?)```/);
      if (codeMatch) evaluation = JSON.parse(codeMatch[1]);
      else {
        return res.status(500).json({ error: 'Risposta LLM non valida', raw });
      }
    }

    res.json(evaluation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============== LEGACY CHAT (role-play) ==============
app.post('/api/chat', async (req, res) => {
  if (!llm) return res.status(503).json({ error: 'Nessun provider LLM configurato' });

  const { messages, temperature = 0.8 } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages deve essere un array' });

  try {
    const raw = await callLLM({ messages, temperature, maxTokens: 150 });
    res.json({ reply: raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`English Coach API listening on http://0.0.0.0:${PORT}`);
  console.log(`Whisper proxy: ${OPENAI_KEY ? 'attivo' : 'disattivato (manca OPENAI_API_KEY)'}`);
  console.log(`LLM provider: ${llm ? `${llm.name} (${llm.model})` : 'NESSUNO — configura OPENAI_API_KEY, GROQ_API_KEY, GEMINI_API_KEY o OLLAMA_URL'}`);
});
