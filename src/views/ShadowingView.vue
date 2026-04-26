<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { shadowingPhrases } from '../data/phrases';
import { useSpeech } from '../composables/useSpeech';
import { useWhisper } from '../composables/useWhisper';
import { saveRecord } from '../composables/useProgress';
import { loadSettings } from '../composables/useProgress';
import AudioRecorder from '../components/AudioRecorder.vue';

const settings = ref<{ level: string; preferredExercise: string }>({ level: 'A1', preferredExercise: 'shadowing' });
const currentIndex = ref(0);
const score = ref(0);
const hasRecorded = ref(false);
const isEvaluating = ref(false);

const { speak, cancel } = useSpeech();
const { isTranscribing, transcribe } = useWhisper();

onMounted(async () => {
  settings.value = await loadSettings();
});

const phrases = computed(() =>
  shadowingPhrases.filter(p => p.level === settings.value.level)
);

const currentPhrase = computed(() => phrases.value[currentIndex.value]);

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const dist = levenshtein(a.toLowerCase().trim(), b.toLowerCase().trim());
  const maxLen = Math.max(a.length, b.length);
  return maxLen === 0 ? 100 : Math.round((1 - dist / maxLen) * 100);
}

async function onRecorded(blob: Blob) {
  hasRecorded.value = true;
  isEvaluating.value = true;
  const text = await transcribe(blob);
  isEvaluating.value = false;
  if (currentPhrase.value) {
    score.value = similarity(text, currentPhrase.value.text);
    await saveRecord({
      id: crypto.randomUUID(),
      type: 'shadowing',
      startedAt: Date.now(),
      completedAt: Date.now(),
      score: score.value,
      transcript: text,
      targetText: currentPhrase.value.text,
    });
  }
}

function nextPhrase() {
  cancel();
  hasRecorded.value = false;
  score.value = 0;
  currentIndex.value = (currentIndex.value + 1) % phrases.value.length;
}

function prevPhrase() {
  cancel();
  hasRecorded.value = false;
  score.value = 0;
  currentIndex.value = (currentIndex.value - 1 + phrases.value.length) % phrases.value.length;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold text-slate-900">Shadowing — Livello {{ settings.level }}</h2>
      <span class="text-sm text-slate-500">{{ currentIndex + 1 }} / {{ phrases.length }}</span>
    </div>

    <div class="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-6">
      <div class="space-y-2">
        <p class="text-2xl font-medium text-slate-900">{{ currentPhrase?.text }}</p>
        <p class="text-slate-500">{{ currentPhrase?.translation }}</p>
      </div>

      <button
        @click="speak(currentPhrase!.text)"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors font-medium"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
        Ascolta
      </button>

      <AudioRecorder @recorded="onRecorded" />

      <div v-if="hasRecorded && !isTranscribing">
        <div class="text-4xl font-bold" :class="score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-500' : 'text-red-500'">
          {{ score }}%
        </div>
        <p class="text-sm text-slate-500 mt-1">
          {{ score >= 80 ? 'Ottimo!' : score >= 50 ? 'Quasi perfetto, riprova!' : 'Continua a esercitarti!' }}
        </p>
      </div>

      <div v-if="isTranscribing" class="text-sm text-slate-500">
        Trascrizione in corso...
      </div>
    </div>

    <div class="flex justify-between">
      <button
        @click="prevPhrase"
        class="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
      >
        ← Precedente
      </button>
      <button
        @click="nextPhrase"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Successiva →
      </button>
    </div>
  </div>
</template>
