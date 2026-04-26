import { ref } from 'vue';

const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3002';

const isTranscribing = ref(false);
const transcript = ref('');

export function useWhisper() {
  async function transcribe(audioBlob: Blob): Promise<string> {
    isTranscribing.value = true;
    transcript.value = '';

    try {
      // Prima: prova il proxy backend Whisper (qualità migliore)
      const proxyResult = await transcribeViaProxy(audioBlob);
      if (proxyResult && proxyResult.trim().length > 2) {
        transcript.value = proxyResult;
        return proxyResult;
      }
    } catch {
      // fallback a Web Speech API
    }

    try {
      // Fallback: Web Speech API (gratis, locale)
      const webResult = await transcribeWithWebSpeech(audioBlob);
      if (webResult && webResult.trim().length > 2) {
        transcript.value = webResult;
        return webResult;
      }
    } catch {
      // nient'altro da fare
    }

    transcript.value = '[Trascrizione non disponibile. Verifica che il backend english-coach-api sia avviato (docker-compose up english-coach-api).]'
    return transcript.value;
  }

  return { isTranscribing, transcript, transcribe };
}

async function transcribeViaProxy(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  const res = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Proxy error ${res.status}`);
  }
  const data = await res.json();
  return data.text || '';
}

function transcribeWithWebSpeech(_audioBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      reject(new Error('Web Speech API non supportata'));
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      resolve(e.results[0][0].transcript);
    };
    rec.onerror = (e: any) => {
      reject(new Error(e.error));
    };
    // La Web Speech API nativa non può processare un Blob direttamente;
    // usiamo il continuous recognition come workaround.
    rec.start();
    setTimeout(() => rec.stop(), 5000);
  });
}
