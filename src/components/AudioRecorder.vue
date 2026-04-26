<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'recorded', blob: Blob): void;
}>();

const isRecording = ref(false);
const audioUrl = ref('');
let mediaRecorder: MediaRecorder | null = null;
let chunks: Blob[] = [];

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      audioUrl.value = URL.createObjectURL(blob);
      emit('recorded', blob);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    isRecording.value = true;
  } catch {
    alert('Permesso microfono negato. Abilita il microfono per registrare.');
  }
}

function stopRecording() {
  mediaRecorder?.stop();
  isRecording.value = false;
}

function toggle() {
  if (isRecording.value) stopRecording();
  else startRecording();
}
</script>

<template>
  <div class="flex flex-col items-center gap-3">
    <button
      @click="toggle"
      :class="[
        'w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg',
        isRecording
          ? 'bg-red-500 animate-pulse shadow-red-300'
          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-300'
      ]"
    >
      <svg v-if="!isRecording" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      <svg v-else class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
      </svg>
    </button>
    <p class="text-sm font-medium" :class="isRecording ? 'text-red-500' : 'text-slate-600'">
      {{ isRecording ? 'Registrazione in corso... Clicca per fermare' : 'Clicca per registrare' }}
    </p>
    <audio v-if="audioUrl && !isRecording" :src="audioUrl" controls class="w-full max-w-xs mt-2" />
  </div>
</template>
