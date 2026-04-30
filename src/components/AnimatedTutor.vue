<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  state: 'idle' | 'listening' | 'thinking' | 'speaking';
}>();

const mouthClass = computed(() => {
  switch (props.state) {
    case 'speaking': return 'animate-mouth';
    case 'listening': return 'mouth-smile';
    case 'thinking': return 'mouth-flat';
    default: return 'mouth-smile';
  }
});

const eyeClass = computed(() => {
  switch (props.state) {
    case 'listening': return 'eye-wide';
    case 'thinking': return 'eye-look-up';
    default: return '';
  }
});

const earClass = computed(() => {
  return props.state === 'listening' ? 'ear-pulse' : '';
});

const bubbleClass = computed(() => {
  return props.state === 'thinking' ? 'animate-bubble' : '';
});
</script>

<template>
  <div class="tutor-avatar flex flex-col items-center">
    <!-- Thought bubble -->
    <div v-if="state === 'thinking'" :class="['thought-bubble', bubbleClass]">
      <svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" opacity="0.3"></circle>
        <circle cx="12" cy="12" r="6" opacity="0.5"></circle>
        <circle cx="12" cy="12" r="3" opacity="0.8"></circle>
      </svg>
    </div>

    <!-- Avatar SVG -->
    <svg viewBox="0 0 200 220" class="w-20 h-20 md:w-24 md:h-24">
      <defs>
        <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fde68a"></stop>
          <stop offset="100%" stop-color="#fbbf24"></stop>
        </linearGradient>
      </defs>

      <!-- Body -->
      <path d="M60 200 Q100 170 140 200 L140 220 L60 220 Z" fill="#3b82f6"></path>

      <!-- Head -->
      <circle cx="100" cy="100" r="50" fill="url(#faceGrad)"></circle>

      <!-- Ears -->
      <g :class="earClass">
        <ellipse cx="48" cy="100" rx="8" ry="14" fill="#fde68a"></ellipse>
        <ellipse cx="152" cy="100" rx="8" ry="14" fill="#fde68a"></ellipse>
      </g>

      <!-- Eyes -->
      <g :class="eyeClass">
        <ellipse cx="82" cy="92" rx="7" ry="9" fill="white"></ellipse>
        <circle cx="82" cy="92" r="4" fill="#1e293b"></circle>
        <circle cx="84" cy="90" r="1.5" fill="white"></circle>

        <ellipse cx="118" cy="92" rx="7" ry="9" fill="white"></ellipse>
        <circle cx="118" cy="92" r="4" fill="#1e293b"></circle>
        <circle cx="120" cy="90" r="1.5" fill="white"></circle>
      </g>

      <!-- Eyebrows -->
      <path v-if="state === 'thinking'" d="M74 78 Q82 74 90 78" stroke="#92400e" stroke-width="2" fill="none" class="animate-eyebrow"></path>
      <path v-else d="M74 78 Q82 74 90 78" stroke="#92400e" stroke-width="2" fill="none"></path>
      <path d="M110 78 Q118 74 126 78" stroke="#92400e" stroke-width="2" fill="none"></path>

      <!-- Nose -->
      <path d="M96 108 Q100 114 104 108" stroke="#d97706" stroke-width="2" fill="none" stroke-linecap="round"></path>

      <!-- Mouth -->
      <ellipse
        cx="100"
        cy="125"
        rx="12"
        ry="6"
        :class="mouthClass"
        fill="#dc2626"
      ></ellipse>
      <ellipse
        cx="100"
        cy="125"
        rx="8"
        ry="2"
        :class="mouthClass + '-tongue'"
        fill="#fca5a5"
        opacity="0.6"
      ></ellipse>

      <!-- Hair -->
      <path d="M52 80 Q60 50 80 55 Q100 45 120 55 Q140 50 148 80 Q150 60 140 48 Q120 35 100 38 Q80 35 60 48 Q50 60 52 80" fill="#78350f"></path>

      <!-- Cheeks -->
      <circle cx="68" cy="110" r="8" fill="#fca5a5" opacity="0.5"></circle>
      <circle cx="132" cy="110" r="8" fill="#fca5a5" opacity="0.5"></circle>
    </svg>

    <!-- Status label -->
    <span class="text-[10px] font-medium text-slate-400 mt-0.5">
      {{ state === 'idle' ? 'Ready' : state === 'listening' ? 'Listening...' : state === 'thinking' ? 'Thinking...' : 'Speaking' }}
    </span>
  </div>
</template>

<style scoped>
.tutor-avatar {
  position: relative;
}

/* Mouth animations */
.animate-mouth {
  animation: mouthTalk 0.3s ease-in-out infinite alternate;
}

@keyframes mouthTalk {
  from { ry: 4; }
  to { ry: 10; }
}

.mouth-smile {
  ry: 6;
}

.mouth-flat {
  rx: 14;
  ry: 2;
}

/* Listening ear pulse */
.ear-pulse ellipse {
  animation: earPulse 1s ease-in-out infinite;
}

@keyframes earPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.1); transform-origin: center; }
}

/* Thinking animations */
.eye-look-up ellipse {
  transform: translateY(-2px);
}

.animate-eyebrow {
  animation: eyebrowRaise 2s ease-in-out infinite;
}

@keyframes eyebrowRaise {
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-2px); }
}

.animate-bubble {
  animation: bubbleFloat 2s ease-in-out infinite;
}

@keyframes bubbleFloat {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(-6px); opacity: 1; }
}

/* Idle subtle breathing */
.tutor-avatar svg {
  animation: breathe 4s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}
</style>
