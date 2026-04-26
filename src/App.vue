<script setup lang="ts">
import { ref } from 'vue';
import HomeView from './views/HomeView.vue';
import ShadowingView from './views/ShadowingView.vue';
import RolePlayView from './views/RolePlayView.vue';

const currentView = ref<'home' | 'shadowing' | 'roleplay'>('home');

function goHome() {
  currentView.value = 'home';
}

// Link dinamico: dev = altra porta, produzione = nginx
const trackerUrl = (typeof location !== 'undefined' && (location.port === '5174' || location.port === '5175'))
  ? 'http://localhost:5173/'
  : 'http://localhost:8000/';
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <header class="bg-white shadow-sm border-b border-slate-200">
      <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            EC
          </div>
          <div>
            <h1 class="text-xl font-bold text-slate-900">English AI Coach</h1>
            <p class="text-xs text-slate-500">Allenati a parlare in inglese</p>
          </div>
        </div>
        <a
          :href="trackerUrl"
          target="_blank"
          class="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
        >
          DevTrack Academy
        </a>
        <button
          v-if="currentView !== 'home'"
          @click="goHome"
          class="text-sm px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors font-medium"
        >
          ← Dashboard
        </button>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 py-8">
      <HomeView
        v-if="currentView === 'home'"
        @start-shadowing="currentView = 'shadowing'"
        @start-roleplay="currentView = 'roleplay'"
      />
      <ShadowingView
        v-else-if="currentView === 'shadowing'"
        @back="goHome"
      />
      <RolePlayView
        v-else-if="currentView === 'roleplay'"
        @back="goHome"
      />
    </main>

    <footer class="border-t border-slate-200 bg-white mt-12">
      <div class="max-w-3xl mx-auto px-4 py-6">
        <p class="text-center text-sm text-slate-500">
          English AI Coach &copy; 2026 — Built with Vue 3 + Web Speech API
        </p>
      </div>
    </footer>
  </div>
</template>
