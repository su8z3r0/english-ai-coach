<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { rolePlayScenarios } from '../data/scenarios';
import { useSpeech } from '../composables/useSpeech';
import { useWhisper } from '../composables/useWhisper';
import { saveRecord, loadSettings } from '../composables/useProgress';
import ChatBubble from '../components/ChatBubble.vue';
import AudioRecorder from '../components/AudioRecorder.vue';
import type { RolePlayScenario, UserSettings } from '../types';

const settings = ref<UserSettings>({ level: 'A1', preferredExercise: 'shadowing' });
const selectedScenario = ref<RolePlayScenario | null>(null);
const messages = ref<{ text: string; isUser: boolean }[]>([]);
const isLoading = ref(false);
const scenarioList = ref<RolePlayScenario[]>([]);
const selectedCategory = ref<string>('all');

const { cancel } = useSpeech();
const { isTranscribing, transcribe } = useWhisper();

const categories = ['all', 'daily', 'travel', 'work', 'social', 'tech'];

const categoryLabels: Record<string, string> = {
  all: 'Tutti',
  daily: 'Quotidiano',
  travel: 'Viaggio',
  work: 'Lavoro',
  social: 'Sociale',
  tech: 'Tecnico',
};

onMounted(async () => {
  settings.value = await loadSettings();
  filterScenarios();
});

function filterScenarios() {
  let list = rolePlayScenarios;
  if (settings.value.level !== 'tech') {
    list = list.filter(s => s.level === settings.value.level || s.level === 'tech');
  }
  if (selectedCategory.value !== 'all') {
    list = list.filter(s => s.category === selectedCategory.value);
  }
  scenarioList.value = list;
}

function selectScenario(scenario: RolePlayScenario) {
  selectedScenario.value = scenario;
  messages.value = [{ text: scenario.firstMessage, isUser: false }];
}

async function onUserMessage(blob: Blob) {
  const text = await transcribe(blob);
  if (!text || text.startsWith('[')) return;
  messages.value.push({ text, isUser: true });
  await getAIResponse(text);
}

const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || 'http://localhost:3002';

async function getAIResponse(userText: string) {
  isLoading.value = true;
  const scenario = selectedScenario.value!;

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: scenario.systemPrompt },
          { role: 'assistant', content: scenario.firstMessage },
          ...messages.value.slice(1).map(m => ({
            role: m.isUser ? 'user' : 'assistant',
            content: m.text,
          })),
        ],
        temperature: 0.8,
      }),
    });

    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    const reply = data.reply || '...';
    messages.value.push({ text: reply, isUser: false });

    await saveRecord({
      id: crypto.randomUUID(),
      type: 'roleplay',
      startedAt: Date.now(),
      completedAt: Date.now(),
      score: 0,
      transcript: userText,
    });
  } catch {
    messages.value.push({
      text: 'Mi dispiace, c\'è stato un errore di connessione con l\'AI. Verifica che il backend sia avviato.',
      isUser: false,
    });
  } finally {
    isLoading.value = false;
  }
}

function backToScenarios() {
  selectedScenario.value = null;
  messages.value = [];
  cancel();
}
</script>

<template>
  <div class="space-y-6">
    <!-- Scenario selection -->
    <div v-if="!selectedScenario">
      <h2 class="text-xl font-bold text-slate-900 mb-4">Scegli uno scenario — Livello {{ settings.level }}</h2>

      <!-- Category filter -->
      <div class="flex flex-wrap gap-2 mb-6">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectedCategory = cat; filterScenarios()"
          :class="[
            'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            selectedCategory === cat
              ? 'bg-purple-600 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          ]"
        >
          {{ categoryLabels[cat] }}
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <button
          v-for="s in scenarioList"
          :key="s.id"
          @click="selectScenario(s)"
          class="bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-purple-400 hover:shadow-md transition-all"
        >
          <div class="flex items-center gap-2 mb-2">
            <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{{ s.category }}</span>
          </div>
          <h3 class="font-bold text-slate-900">{{ s.titleIt }}</h3>
          <p class="text-sm text-slate-500 mt-1">{{ s.titleEn }}</p>
        </button>
      </div>
    </div>

    <!-- Chat -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-900">{{ selectedScenario.titleIt }}</h2>
          <p class="text-sm text-slate-500">{{ selectedScenario.titleEn }}</p>
        </div>
        <button
          @click="backToScenarios"
          class="text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          Cambia scenario
        </button>
      </div>

      <div class="bg-slate-100 rounded-xl p-4 space-y-3 min-h-[300px]">
        <ChatBubble
          v-for="(msg, i) in messages"
          :key="i"
          :text="msg.text"
          :is-user="msg.isUser"
          :auto-speak="!msg.isUser && i === messages.length - 1"
        />

        <div v-if="isLoading" class="flex justify-start">
          <div class="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
              <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.1s" />
              <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0.2s" />
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 p-4">
        <div class="text-sm text-slate-600 mb-3">
          <span class="font-medium">Vocabolario utile:</span>
          {{ selectedScenario.vocabulary.join(', ') }}
        </div>
        <AudioRecorder @recorded="onUserMessage" />

        <p v-if="isTranscribing" class="text-center text-sm text-slate-500 mt-2">
          Trascrizione in corso...
        </p>
      </div>
    </div>
  </div>
</template>
