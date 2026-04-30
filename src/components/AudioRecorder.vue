<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'recorded', blob: Blob): void;
  (e: 'recording', isRecording: boolean): void;
}>();

const isRecording = ref(false);
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
      emit('recorded', blob);
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    isRecording.value = true;
    emit('recording', true);
  } catch {
    alert('Microphone permission denied. Please enable microphone access.');
  }
}

function stopRecording() {
  mediaRecorder?.stop();
  isRecording.value = false;
  emit('recording', false);
}

function toggle() {
  if (isRecording.value) stopRecording();
  else startRecording();
}
</script>

<template>
  <button
    @click="toggle"
    :class="[
      'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-md shrink-0',
      isRecording
        ? 'bg-red-500 shadow-red-300'
        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-300'
    ]"
  >
    <!-- Microphone icon -->
    <svg v-if="!isRecording" class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
    <!-- Stop icon when recording -->
    <svg v-else class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  </button>
</template>
