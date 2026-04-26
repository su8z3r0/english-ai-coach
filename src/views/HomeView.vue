<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { loadSettings, saveSettings, getDailyProgress, type DailyProgress } from '../composables/useProgress';

const emit = defineEmits<{
  (e: 'start-shadowing'): void;
  (e: 'start-roleplay'): void;
}>();

import type { UserSettings } from '../types';
const settings = ref<UserSettings>({ level: 'A1', preferredExercise: 'shadowing' });
const progress = ref<DailyProgress[]>([]);
const currentStreak = ref(0);

onMounted(async () => {
  settings.value = await loadSettings();
  progress.value = await getDailyProgress();
  if (progress.value.length > 0) {
    currentStreak.value = progress.value[progress.value.length - 1].streak;
  }
});

function getLevelLabel(level: string) {
  const labels: Record<string, string> = {
    A1: 'Principiante',
    A2: 'Elementare',
    B1: 'Intermedio',
    B2: 'Intermedio-Avanzato',
    tech: 'Inglese Tecnico',
  };
  return labels[level] || level;
}

const totalExercises = computed(() => progress.value.reduce((s, d) => s + d.exercises, 0));

function setLevel(lvl: UserSettings['level']) {
  settings.value.level = lvl;
  saveSettings(settings.value);
}
</script>

<template>
  <div class="space-y-8">
    <!-- Level selector -->
    <div class="flex flex-wrap gap-2">
      <button
        v-for="lvl in (['A1', 'A2', 'B1', 'B2', 'tech'] as const)"
        :key="lvl"
        @click="setLevel(lvl)"
        :class="[
          'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
          settings.level === lvl
            ? 'bg-blue-600 text-white'
            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
        ]"
      >
        {{ getLevelLabel(lvl) }}
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-2xl font-bold text-blue-600">{{ currentStreak }}</div>
        <div class="text-xs text-slate-500 mt-1">Giorni di fila</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-2xl font-bold text-green-600">{{ totalExercises }}</div>
        <div class="text-xs text-slate-500 mt-1">Esercizi fatti</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-2xl font-bold text-purple-600">{{ getLevelLabel(settings.level) }}</div>
        <div class="text-xs text-slate-500 mt-1">Livello attuale</div>
      </div>
    </div>

    <!-- Exercises -->
    <div class="space-y-4">
      <h2 class="text-lg font-bold text-slate-900">Scegli un esercizio</h2>

      <div class="grid gap-4 md:grid-cols-2">
        <button
          @click="emit('start-shadowing')"
          class="group bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <h3 class="font-bold text-slate-900 mb-1">Shadowing</h3>
          <p class="text-sm text-slate-500">
            Ascolta una frase e ripetila. Confronta la tua pronuncia con l'originale.
          </p>
        </button>

        <button
          @click="emit('start-roleplay')"
          class="group bg-white rounded-xl border border-slate-200 p-6 text-left hover:border-purple-400 hover:shadow-md transition-all"
        >
          <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
            <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <h3 class="font-bold text-slate-900 mb-1">Role Play</h3>
          <p class="text-sm text-slate-500">
            Simula una conversazione reale: ristorante, aeroporto, colloquio...
          </p>
        </button>
      </div>
    </div>

    <!-- Progress chart -->
    <div v-if="progress.length > 0" class="bg-white rounded-xl border border-slate-200 p-6">
      <h2 class="text-lg font-bold text-slate-900 mb-4">Andamento</h2>
      <div class="flex items-end gap-2 h-32">
        <div
          v-for="day in progress.slice(-14)"
          :key="day.date"
          class="flex-1 flex flex-col items-center gap-1"
        >
          <div
            class="w-full bg-blue-500 rounded-t"
            :style="{ height: Math.max(day.avgScore, 5) + '%' }"
          />
          <span class="text-[10px] text-slate-400">{{ day.date.slice(5) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
