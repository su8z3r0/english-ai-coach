const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

const PORT = process.env.PORT || 3002;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, whisper: !!OPENAI_KEY, chat: !!OPENAI_KEY });
});

// Proxy trascrizione Whisper
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(503).json({ error: 'OpenAI API key non configurata' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Nessun file audio' });
  }

  try {
    const FormData = (await import('node-fetch')).FormData;
    const fetch = (await import('node-fetch')).default;

    const form = new FormData();
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

// Proxy chat GPT
app.post('/api/chat', async (req, res) => {
  if (!OPENAI_KEY) {
    return res.status(503).json({ error: 'OpenAI API key non configurata' });
  }

  const { messages, temperature = 0.8 } = req.body;
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages deve essere un array' });
  }

  try {
    const fetch = (await import('node-fetch')).default;

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 150,
        temperature,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data.error?.message || 'OpenAI error' });
    }
    res.json({ reply: data.choices?.[0]?.message?.content?.trim() || '...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`English Coach API listening on http://0.0.0.0:${PORT}`);
  console.log(`Whisper proxy: ${OPENAI_KEY ? 'attivo' : 'disattivato (manca OPENAI_API_KEY)'}`);
  console.log(`Chat proxy:    ${OPENAI_KEY ? 'attivo' : 'disattivato (manca OPENAI_API_KEY)'}`);
});
