<script setup lang="ts">
import type { Correction } from '../types';

defineProps<{
  correction: Correction;
}>();

const severityColor = {
  minor: 'bg-amber-50 border-amber-200 text-amber-800',
  major: 'bg-red-50 border-red-200 text-red-800',
};

const severityLabel = {
  minor: 'Piccolo errore',
  major: 'Errore importante',
};
</script>

<template>
  <div :class="['rounded-lg border px-3 py-2 text-sm mt-2', severityColor[correction.severity]]">
    <div class="flex items-center gap-2 mb-1">
      <span class="text-xs font-semibold uppercase tracking-wider">{{ severityLabel[correction.severity] }}</span>
    </div>
    <div class="space-y-1">
      <div class="flex items-center gap-2">
        <span class="line-through opacity-60">{{ correction.original }}</span>
        <svg class="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
        </svg>
        <span class="font-medium">{{ correction.corrected }}</span>
      </div>
      <ul v-if="correction.issues.length > 0" class="mt-1 space-y-0.5 text-xs">
        <li v-for="(issue, i) in correction.issues" :key="i" class="flex items-start gap-1">
          <span class="mt-0.5"><span class="w-1.5 h-1.5 rounded-full bg-current inline-block opacity-50"></span></span>
          <span>{{ issue }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
