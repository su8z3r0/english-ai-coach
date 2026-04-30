<script setup lang="ts">
const topics = [
  { id: 'free', label: 'Free Conversation', icon: '💬' },
  { id: 'daily', label: 'Daily Life', icon: '🏠' },
  { id: 'work', label: 'Work & Career', icon: '💼' },
  { id: 'travel', label: 'Travel', icon: '✈️' },
  { id: 'food', label: 'Food & Dining', icon: '🍽️' },
  { id: 'tech', label: 'Technology', icon: '💻' },
  { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
  { id: 'health', label: 'Health & Fitness', icon: '🏋️' },
];

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const emit = defineEmits<{
  (e: 'start', topic: string, level: string): void;
}>();

import { ref } from 'vue';

const selectedLevel = ref('B1');

function start(topicLabel: string, level: string) {
  emit('start', topicLabel, level);
}
</script>

<template>
  <div class="space-y-8">
    <div class="text-center space-y-2">
      <h2 class="text-2xl font-bold text-slate-900">English AI Tutor</h2>
      <p class="text-slate-500">Choose a topic and start speaking!</p>
    </div>

    <!-- Level selector -->
    <div class="flex flex-wrap justify-center gap-2">
      <button
        v-for="lvl in levels"
        :key="lvl"
        @click="selectedLevel = lvl"
        :class="[
          'px-4 py-2 rounded-full text-sm font-medium transition-colors border',
          selectedLevel === lvl
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
        ]"
      >
        {{ lvl }}
      </button>
    </div>

    <!-- Topics grid -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <button
        v-for="t in topics"
        :key="t.id"
        @click="start(t.label, selectedLevel)"
        class="group bg-white rounded-xl border border-slate-200 p-6 text-center hover:border-blue-400 hover:shadow-md transition-all"
      >
        <div class="text-4xl mb-3">{{ t.icon }}</div>
        <h3 class="font-bold text-slate-900">{{ t.label }}</h3>
      </button>
    </div>
  </div>
</template>
