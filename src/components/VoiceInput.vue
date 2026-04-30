<script setup lang="ts">
import { ref } from 'vue';
import { useSpeechRecognition } from '../composables/useSpeechRecognition';

const emit = defineEmits<{
  (e: 'transcript', text: string): void;
  (e: 'listening'): void;
  (e: 'stopped'): void;
}>();

const { isListening, interimTranscript, startListening, stopListening } = useSpeechRecognition();
const error = ref('');
const textInput = ref('');
const showTextInput = ref(false);

const hasSpeechApi = !!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition;
const isTouchDevice = 'ontouchstart' in window;
const touchHandled = ref(false);
let listeningPromise: Promise<string> | null = null;

function start() {
  // Su dispositivi touch, ignora mousedown simulato dopo touchstart
  if (isTouchDevice && touchHandled.value) return;
  touchHandled.value = true;

  if (isListening.value) return;
  error.value = '';
  console.log('[VoiceInput] start called');
  emit('listening');
  try {
    listeningPromise = startListening();
  } catch (err: any) {
    error.value = err.message || 'Speech recognition failed';
    console.error('[VoiceInput] start error:', err);
    emit('stopped');
    touchHandled.value = false;
  }
}

async function stop() {
  console.log('[VoiceInput] stop called');
  stopListening();

  // Aspetta che la Promise si risolva (onend) per avere il testo finale
  if (listeningPromise) {
    try {
      const text = await listeningPromise;
      console.log('[VoiceInput] got text from promise:', text);
      if (text) {
        emit('transcript', text);
      }
    } catch (err: any) {
      console.error('[VoiceInput] recognition error:', err);
      error.value = err.message || 'Speech recognition failed';
    } finally {
      listeningPromise = null;
      emit('stopped');
    }
  } else {
    emit('stopped');
  }

  // reset touch flag dopo un breve delay
  setTimeout(() => { touchHandled.value = false; }, 300);
}

function sendText() {
  if (!textInput.value.trim()) return;
  emit('transcript', textInput.value.trim());
  textInput.value = '';
}

function toggleTextInput() {
  showTextInput.value = !showTextInput.value;
}
</script>

<template>
  <div class="w-full space-y-2">
    <!-- Error -->
    <p v-if="error" class="text-xs text-red-500 text-center">{{ error }}</p>

    <!-- Text input mode -->
    <div v-if="showTextInput || !hasSpeechApi" class="flex items-center gap-2">
      <input
        v-model="textInput"
        type="text"
        placeholder="Type in English..."
        class="flex-1 bg-white rounded-full px-4 py-2.5 text-sm text-slate-800 border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        @keydown.enter="sendText"
      />
      <button
        @click="sendText"
        class="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md shrink-0"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>

    <!-- Voice input bar -->
    <div v-else class="flex items-center gap-3">
      <!-- Live transcript display -->
      <div
        :class="[
          'flex-1 rounded-full px-4 py-2.5 text-sm border shadow-sm min-h-[42px] flex items-center transition-colors',
          isListening
            ? 'bg-red-50 border-red-300 text-red-800'
            : 'bg-white border-slate-200 text-slate-800'
        ]"
      >
        <span v-if="interimTranscript" class="font-medium">{{ interimTranscript }}</span>
        <span v-else-if="isListening" class="font-semibold flex items-center gap-2">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          HOLD to speak...
        </span>
        <span v-else class="text-slate-400">Hold the mic button to speak</span>
      </div>

      <!-- Mic button: hold to record -->
      <button
        @mousedown="start"
        @mouseup="stop"
        @mouseleave="stop"
        @touchstart.prevent="start"
        @touchend.prevent="stop"
        @touchcancel.prevent="stop"
        :class="[
          'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg shrink-0 select-none border-4',
          isListening
            ? 'bg-red-500 border-red-200 shadow-red-300 scale-110'
            : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-200 shadow-emerald-300'
        ]"
      >
        <svg v-if="!isListening" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
        <svg v-else class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
        </svg>
      </button>

      <!-- Toggle text input -->
      <button
        @click="toggleTextInput"
        class="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center shrink-0"
        title="Type instead"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>
    </div>
  </div>
</template>
