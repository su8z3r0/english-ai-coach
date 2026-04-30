<script setup lang="ts">
import { watch } from 'vue';
import { useSpeech } from '../composables/useSpeech';

const props = defineProps<{
  text: string;
  isUser: boolean;
  autoSpeak?: boolean;
  time?: string;
}>();

const { speak } = useSpeech();

watch(() => props.text, (newText) => {
  if (props.autoSpeak && newText && !props.isUser) {
    speak(newText);
  }
}, { immediate: true });

const now = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
</script>

<template>
  <div :class="['flex w-full', isUser ? 'justify-end' : 'justify-start']">
    <div
      :class="[
        'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm relative',
        isUser
          ? 'bg-emerald-100 text-emerald-900 rounded-br-sm'
          : 'bg-white text-slate-800 rounded-bl-sm border border-slate-100'
      ]"
    >
      <p class="whitespace-pre-wrap">{{ text }}</p>
      <div class="flex items-end justify-between gap-2 mt-1">
        <span class="text-[10px] opacity-60 select-none">{{ time || now }}</span>
        <!-- Listen button per messaggi AI -->
        <button
          v-if="!isUser"
          @click="speak(text)"
          class="opacity-50 hover:opacity-100 transition-opacity ml-1"
          title="Ascolta"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
