<script setup lang="ts">
import { watch } from 'vue';
import { useSpeech } from '../composables/useSpeech';

const props = defineProps<{
  text: string;
  isUser: boolean;
  autoSpeak?: boolean;
}>();

const { speak } = useSpeech();

watch(() => props.text, (newText) => {
  if (props.autoSpeak && newText && !props.isUser) {
    speak(newText);
  }
}, { immediate: true });
</script>

<template>
  <div :class="['flex', isUser ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-white text-slate-800 border border-slate-200 rounded-bl-md shadow-sm'
      ]"
    >
      <p>{{ text }}</p>
      <button
        v-if="!isUser"
        @click="speak(text)"
        class="mt-2 text-xs flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
        :class="isUser ? 'text-blue-100' : 'text-slate-500'"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        Ascolta
      </button>
    </div>
  </div>
</template>
