<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  getDailyProgress,
  getSessions,
  getRecurrentErrors,
  loadSettings,
  type DailyProgress,
  type UserSettings,
} from '../composables/useProgress';

const progress = ref<DailyProgress[]>([]);
const sessions = ref<any[]>([]);
const errors = ref<{ issue: string; count: number }[]>([]);
const settings = ref<UserSettings>({ level: 'A1', preferredExercise: 'shadowing' });

onMounted(async () => {
  progress.value = await getDailyProgress();
  sessions.value = await getSessions();
  errors.value = await getRecurrentErrors();
  settings.value = await loadSettings();
});

const totalSessions = computed(() => sessions.value.length);
const avgFluency = computed(() => {
  if (sessions.value.length === 0) return 0;
  return Math.round(sessions.value.reduce((s, sess) => s + (sess.avgFluencyScore || 0), 0) / sessions.value.length);
});

const currentStreak = computed(() => {
  if (progress.value.length === 0) return 0;
  return progress.value[progress.value.length - 1].streak;
});

const levelProgress = computed(() => {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const idx = levels.indexOf(settings.value.level);
  return { current: settings.value.level, next: levels[idx + 1] || 'C2', percent: (idx + 1) * 16 };
});
</script>

<template>
  <div class="space-y-8">
    <div class="text-center space-y-2">
      <h2 class="text-2xl font-bold text-slate-900">Your Progress</h2>
      <p class="text-slate-500">Track your English learning journey</p>
    </div>

    <!-- Stats cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-3xl font-bold text-blue-600">{{ totalSessions }}</div>
        <div class="text-xs text-slate-500 mt-1">Tutor Sessions</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-3xl font-bold text-green-600">{{ avgFluency }}</div>
        <div class="text-xs text-slate-500 mt-1">Avg Fluency</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-3xl font-bold text-amber-600">{{ currentStreak }}</div>
        <div class="text-xs text-slate-500 mt-1">Day Streak</div>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 p-4 text-center">
        <div class="text-3xl font-bold text-purple-600">{{ settings.level }}</div>
        <div class="text-xs text-slate-500 mt-1">Current Level</div>
      </div>
    </div>

    <!-- Fluency over time (simple bar chart) -->
    <div v-if="sessions.length > 0" class="bg-white rounded-xl border border-slate-200 p-6">
      <h3 class="font-bold text-slate-900 mb-4">Fluency Over Time</h3>
      <div class="flex items-end gap-2 h-32">
        <div
          v-for="sess in sessions.slice(-14)"
          :key="sess.id"
          class="flex-1 flex flex-col items-center gap-1"
        >
          <div
            class="w-full bg-blue-500 rounded-t transition-all"
            :style="{ height: Math.max(sess.avgFluencyScore || 5, 5) + '%' }"
          />
          <span class="text-[10px] text-slate-400">{{ new Date(sess.startedAt).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }) }}</span>
        </div>
      </div>
    </div>

    <!-- Recurrent errors -->
    <div v-if="errors.length > 0" class="bg-white rounded-xl border border-slate-200 p-6">
      <h3 class="font-bold text-slate-900 mb-4">Areas to Improve</h3>
      <div class="space-y-3">
        <div
          v-for="err in errors.slice(0, 5)"
          :key="err.issue"
          class="flex items-center gap-3"
        >
          <div class="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
            <div
              class="bg-amber-500 h-4 rounded-full transition-all"
              :style="{ width: Math.min(err.count * 10, 100) + '%' }"
            />
          </div>
          <span class="text-sm text-slate-600 w-24 text-right">{{ err.issue }}</span>
          <span class="text-xs text-slate-400 w-8">{{ err.count }}</span>
        </div>
      </div>
    </div>

    <!-- Level progress -->
    <div class="bg-white rounded-xl border border-slate-200 p-6">
      <h3 class="font-bold text-slate-900 mb-4">Level Progress</h3>
      <div class="flex items-center justify-between text-sm text-slate-600 mb-2">
        <span>{{ levelProgress.current }}</span>
        <span>{{ levelProgress.next }}</span>
      </div>
      <div class="bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          class="bg-green-500 h-3 rounded-full transition-all"
          :style="{ width: levelProgress.percent + '%' }"
        />
      </div>
    </div>
  </div>
</template>
