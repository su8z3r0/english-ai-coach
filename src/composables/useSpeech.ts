import { ref } from 'vue';

const isSpeaking = ref(false);

export function useSpeech() {
  const synth = window.speechSynthesis;

  function getEnglishVoice(): SpeechSynthesisVoice | undefined {
    const voices = synth.getVoices();
    const preferred = voices.find(v =>
      v.lang.startsWith('en') &&
      (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel'))
    );
    return preferred || voices.find(v => v.lang.startsWith('en'));
  }

  function speak(text: string, lang = 'en-US'): Promise<void> {
    return new Promise((resolve) => {
      if (!synth) {
        resolve();
        return;
      }
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 0.9;
      utter.pitch = 1;
      const voice = lang.startsWith('en') ? getEnglishVoice() : undefined;
      if (voice) utter.voice = voice;
      utter.onend = () => {
        isSpeaking.value = false;
        resolve();
      };
      utter.onerror = () => {
        isSpeaking.value = false;
        resolve();
      };
      isSpeaking.value = true;
      synth.speak(utter);
    });
  }

  function speakItalian(text: string): Promise<void> {
    return speak(text, 'it-IT');
  }

  function cancel() {
    synth?.cancel();
    isSpeaking.value = false;
  }

  return {
    isSpeaking,
    speak,
    speakItalian,
    cancel,
    getEnglishVoice,
  };
}
