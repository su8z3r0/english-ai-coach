<script setup lang="ts">
import { ref } from 'vue';
import TutorView from './views/TutorView.vue';
import ProgressDashboard from './views/ProgressDashboard.vue';
import ShadowingView from './views/ShadowingView.vue';
import RolePlayView from './views/RolePlayView.vue';

type View = 'tutor' | 'progress' | 'shadowing' | 'roleplay';

const currentView = ref<View>('tutor');
const showExercises = ref(false);

// Link dinamico: dev = altra porta, produzione = path relativo
const trackerUrl = (typeof location !== 'undefined' && location.hostname === 'localhost' && (location.port === '5174' || location.port === '5175'))
  ? 'http://localhost:5173/'
  : '/';

const navItems: { key: View; label: string }[] = [
  { key: 'tutor', label: 'Tutor' },
  { key: 'progress', label: 'Progress' },
];
</script>

<template>
  <div :class="['bg-slate-50', currentView === 'tutor' ? 'h-[100dvh] flex flex-col overflow-hidden' : 'min-h-screen']">
    <!-- Header -->
    <header :class="['bg-white shadow-sm border-b border-slate-200', currentView === 'tutor' ? 'shrink-0' : '']">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            EC
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900">English AI Coach</h1>
            <p class="text-xs text-slate-500">Your personal English tutor</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a
            :href="trackerUrl"
            class="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
          >
            DevTrack Academy
          </a>
        </div>
      </div>

      <!-- Navigation -->
      <div class="max-w-3xl mx-auto px-4 pb-3 flex items-center gap-2">
        <button
          v-for="item in navItems"
          :key="item.key"
          @click="currentView = item.key; showExercises = false"
          :class="[
            'text-sm px-3 py-1.5 rounded-lg font-medium transition-colors',
            currentView === item.key && !showExercises
              ? 'bg-blue-100 text-blue-700'
              : 'text-slate-600 hover:bg-slate-100'
          ]"
        >
          {{ item.label }}
        </button>

        <div class="relative">
          <button
            @click="showExercises = !showExercises"
            :class="[
              'text-sm px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1',
              showExercises
                ? 'bg-blue-100 text-blue-700'
                : 'text-slate-600 hover:bg-slate-100'
            ]"
          >
            Exercises
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            v-if="showExercises"
            class="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10 min-w-[160px]"
          >
            <button
              @click="currentView = 'shadowing'; showExercises = false"
              class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Shadowing
            </button>
            <button
              @click="currentView = 'roleplay'; showExercises = false"
              class="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Role Play
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Main content -->
    <main
      :class="[
        'mx-auto w-full',
        currentView === 'tutor'
          ? 'flex-1 flex flex-col p-0 max-w-none overflow-hidden'
          : 'max-w-3xl px-4 py-8'
      ]"
    >
      <KeepAlive>
        <TutorView
          v-if="currentView === 'tutor'"
          @back="currentView = 'progress'"
        />
      </KeepAlive>
      <ProgressDashboard
        v-if="currentView === 'progress'"
      />
      <ShadowingView
        v-if="currentView === 'shadowing'"
        @back="currentView = 'tutor'"
      />
      <RolePlayView
        v-if="currentView === 'roleplay'"
        @back="currentView = 'tutor'"
      />
    </main>

    <!-- Footer -->
    <footer v-if="currentView !== 'tutor'" class="border-t border-slate-200 bg-white mt-12">
      <div class="max-w-3xl mx-auto px-4 py-6">
        <p class="text-center text-sm text-slate-500">
          English AI Coach &copy; 2026 — Built with Vue 3 + Web Speech API
        </p>
      </div>
    </footer>
  </div>
</template>
