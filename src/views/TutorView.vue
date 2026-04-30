<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue';
import { useTutor } from '../composables/useTutor';
import { useSpeech } from '../composables/useSpeech';
import ChatBubble from '../components/ChatBubble.vue';
import VoiceInput from '../components/VoiceInput.vue';
import CorrectionBubble from '../components/CorrectionBubble.vue';
import TutorTopicSelector from '../components/TutorTopicSelector.vue';

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const {
  messages,
  isLoading,
  currentTopic,
  startSession,
  sendMessage,
  endSession,
  getSessionAvgScore,
  loadActiveSession,
  cancel,
} = useTutor();

const { isSpeaking } = useSpeech();
const showSelector = ref(true);
const chatContainer = ref<HTMLDivElement | null>(null);

function onStart(topic: string, level: string) {
  showSelector.value = false;
  startSession(topic, level);
}

function onNewTopic() {
  endSession();
  showSelector.value = true;
}

async function onTranscript(text: string) {
  console.log('Received transcript:', text);
  if (!text.trim()) return;
  try {
    await sendMessage(undefined, text);
  } catch (err) {
    console.error('Error sending message:', err);
  }
}

watch(messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
}, { deep: true });

onMounted(async () => {
  cancel();
  const restored = await loadActiveSession();
  if (restored) {
    showSelector.value = false;
  }
});

const currentLevel = computed(() => {
  const lastEval = messages.value
    .filter(m => m.role === 'user' && m.evaluation)
    .pop()?.evaluation;
  return lastEval?.levelEstimate || '';
});
</script>

<template>
  <div class="flex flex-col flex-1 h-full overflow-hidden">
    <!-- Topic Selector -->
    <TutorTopicSelector
      v-if="showSelector"
      @start="onStart"
    />

    <!-- Chat View -->
    <template v-else>
      <!-- Chat Header (stile WhatsApp) -->
      <div class="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          @click="emit('back')"
          class="text-slate-500 hover:text-slate-700 transition-colors"
          title="Back"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div class="flex-1 min-w-0">
          <div class="font-semibold text-slate-900 truncate">{{ currentTopic }}</div>
          <div class="text-xs text-slate-500 flex items-center gap-2">
            <span v-if="currentLevel">Level {{ currentLevel }}</span>
            <span>· Score {{ getSessionAvgScore() }}/100</span>
          </div>
        </div>

        <button
          @click="onNewTopic"
          class="text-slate-500 hover:text-slate-700 transition-colors text-sm font-medium px-2 py-1"
          title="New topic"
        >
          New
        </button>
      </div>

      <!-- Messages Area -->
      <div
        ref="chatContainer"
        class="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#efeae2]"
      >
        <!-- Welcome -->
        <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-slate-400">
          <svg class="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p class="text-sm">Say something to start the conversation!</p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="space-y-1"
        >
          <ChatBubble
            :text="msg.text"
            :is-user="msg.role === 'user'"
            :auto-speak="msg.role === 'assistant' && msg.id === messages[messages.length - 1]?.id"
          />

          <!-- Correction inline below user message -->
          <CorrectionBubble
            v-if="msg.role === 'user' && msg.correction"
            :correction="msg.correction"
          />

          <!-- Evaluation badge inline below user message -->
          <div v-if="msg.role === 'user' && msg.evaluation" class="flex justify-end">
            <div class="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] space-y-0.5 max-w-[70%] shadow-sm">
              <div class="flex items-center gap-2">
                <span class="text-emerald-600 font-semibold">Fluency {{ msg.evaluation.fluencyScore }}</span>
                <span class="text-blue-600 font-semibold">Vocab {{ msg.evaluation.vocabularyScore }}</span>
              </div>
              <div class="text-slate-500">{{ msg.evaluation.encouragement }}</div>
            </div>
          </div>
        </div>

        <!-- "Typing..." indicator -->
        <div v-if="isLoading || isSpeaking" class="flex justify-start">
          <div class="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div class="flex gap-1.5 items-center">
              <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.15s" />
              <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.3s" />
            </div>
          </div>
        </div>
      </div>

      <!-- Input Bar (stile WhatsApp) -->
      <div class="bg-slate-100 border-t border-slate-200 px-4 py-3 shrink-0">
        <VoiceInput @transcript="onTranscript" />
      </div>
    </template>
  </div>
</template>
