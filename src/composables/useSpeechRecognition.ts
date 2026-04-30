import { ref } from 'vue';

export function useSpeechRecognition() {
  const isListening = ref(false);
  const transcript = ref('');
  const interimTranscript = ref('');
  let recognition: any = null;
  let stopResolve: ((text: string) => void) | null = null;

  function startListening(): Promise<string> {
    if (isListening.value) {
      console.log('[Speech] Already listening, skip');
      return Promise.resolve(transcript.value.trim());
    }

    return new Promise((resolve, reject) => {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      transcript.value = '';
      interimTranscript.value = '';
      isListening.value = true;
      stopResolve = resolve;
      console.log('[Speech] Start listening');

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += result + ' ';
            console.log('[Speech] Final result:', result);
          } else {
            interim += result;
            console.log('[Speech] Interim result:', result);
          }
        }
        if (final) transcript.value += final;
        interimTranscript.value = interim;
      };

      recognition.onerror = (event: any) => {
        console.error('[Speech] onerror:', event.error);
        isListening.value = false;
        recognition = null;
        stopResolve = null;
        reject(new Error(event.error));
      };

      recognition.onend = () => {
        // Combina final + interim: spesso interim contiene il testo che non e' stato marcato come final
        const fullText = (transcript.value + ' ' + interimTranscript.value).trim();
        console.log('[Speech] onend. transcript:', JSON.stringify(transcript.value), 'interim:', JSON.stringify(interimTranscript.value), 'full:', JSON.stringify(fullText));
        isListening.value = false;
        recognition = null;
        if (stopResolve) {
          stopResolve(fullText);
          stopResolve = null;
        }
      };

      try {
        recognition.start();
      } catch (err: any) {
        console.error('[Speech] start() threw:', err);
        isListening.value = false;
        recognition = null;
        stopResolve = null;
        reject(new Error(err.message || 'Failed to start speech recognition'));
      }
    });
  }

  function stopListening() {
    console.log('[Speech] stopListening. transcript:', JSON.stringify(transcript.value));
    if (recognition) {
      try { recognition.stop(); } catch { /* già fermato */ }
      recognition = null;
    }
  }

  function getText() {
    const text = (transcript.value + ' ' + interimTranscript.value).trim();
    console.log('[Speech] getText:', JSON.stringify(text));
    return text;
  }

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    getText,
  };
}
