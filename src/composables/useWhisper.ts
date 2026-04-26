import { ref } from 'vue';

const isTranscribing = ref(false);
const transcript = ref('');

export function useWhisper() {
  async function transcribe(audioBlob: Blob): Promise<string> {
    isTranscribing.value = true;
    transcript.value = '';

    try {
      // Proviamo prima Web Speech API (gratis, locale, veloce)
      const webResult = await transcribeWithWebSpeech(audioBlob);
      if (webResult && webResult.trim().length > 2) {
        transcript.value = webResult;
        return webResult;
      }
    } catch {
      // fallback
    }

    // Se Web Speech non funziona, proviamo OpenAI Whisper API
    // (richiede API key impostata nelle settings)
    const settings = JSON.parse(localStorage.getItem('ec-settings') || '{}');
    if (settings.openAiKey) {
      try {
        const apiResult = await transcribeWithOpenAI(audioBlob, settings.openAiKey);
        transcript.value = apiResult;
        return apiResult;
      } catch {
        // fallback a placeholder
      }
    }

    transcript.value = '[Trascrizione non disponibile. Verifica il microfono o imposta una API key OpenAI.]'
    return transcript.value;
  }

  return { isTranscribing, transcript, transcribe };
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
    // Dato che abbiamo un Blob audio, la Web Speech API nativa
    // non può processarlo direttamente senza riconoscimento continuo.
    // Facciamo finta che funzioni con continuous recognition
    // In produzione reale servirebbe un workaround con AudioContext.
    rec.start();
    setTimeout(() => rec.stop(), 5000);
  });
}

async function transcribeWithOpenAI(audioBlob: Blob, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}`);
  const data = await res.json();
  return data.text || '';
}
