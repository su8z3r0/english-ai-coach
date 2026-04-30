import { ref } from 'vue';
import type { ConversationMessage, Correction, TutorSession, UserMemory } from '../types';
import { useSpeech } from './useSpeech';
import { useWhisper } from './useWhisper';
import { useEvaluator } from './useEvaluator';
import {
  saveSession,
  saveRecord,
  getActiveSession,
  endSession as endActiveSession,
  loadMemory,
  saveMemory,
} from './useProgress';

const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '';

const messages = ref<ConversationMessage[]>([]);
const isLoading = ref(false);
const currentSessionId = ref<string | null>(null);
const currentTopic = ref('Free Conversation');
const sessionScores = ref<number[]>([]);
const memory = ref<UserMemory | null>(null);

const { speak, cancel } = useSpeech();
const { transcribe } = useWhisper();
const { evaluate } = useEvaluator();

const MAX_CONTEXT_MSGS = 10;
const EVALUATE_EVERY_N = 3;

function pruneConversation(msgs: ConversationMessage[]): { role: string; content: string }[] {
  // Se troppi messaggi, invia solo gli ultimi MAX_CONTEXT_MSGS al backend
  const recent = msgs.length > MAX_CONTEXT_MSGS
    ? msgs.slice(-MAX_CONTEXT_MSGS)
    : msgs;
  return recent.map(m => ({ role: m.role, content: m.text }));
}

function buildMemoryContext(session: TutorSession): string {
  const userMsgs = session.messages.filter(m => m.role === 'user');
  const corrections = session.messages
    .filter(m => m.correction)
    .map(m => m.correction!);

  const errorCounts = new Map<string, number>();
  for (const c of corrections) {
    for (const issue of c.issues) {
      const key = issue.split(':')[0]?.trim() || issue;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);
    }
  }
  const topErrors = Array.from(errorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  const avgLevel = session.messages
    .filter(m => m.evaluation?.levelEstimate)
    .map(m => m.evaluation!.levelEstimate);
  const level = avgLevel.length > 0
    ? avgLevel[Math.floor(avgLevel.length / 2)]
    : 'A1';

  const summary = userMsgs.length > 0
    ? `The student practiced ${session.topic} and sent ${userMsgs.length} messages. Average fluency score: ${session.avgFluencyScore}.`
    : '';

  return [
    summary,
    topErrors.length ? `Recurrent errors to focus on: ${topErrors.join(', ')}.` : '',
    `Estimated level: ${level}.`,
  ].filter(Boolean).join(' ');
}

export function useTutor() {
  async function startSession(topic?: string, _level?: string) {
    // Carica memoria da sessioni precedenti
    memory.value = await loadMemory();
    console.log('[Tutor] Loaded memory:', memory.value);

    currentSessionId.value = crypto.randomUUID();
    currentTopic.value = topic || 'Free Conversation';
    messages.value = [];
    sessionScores.value = [];

    let welcome = topic
      ? `Let's talk about ${topic}! I'm your English tutor. How are you today?`
      : "Hello! I'm your English tutor. What would you like to talk about today?";

    // Se c'e' memoria, personalizza il benvenuto
    if (memory.value && memory.value.summary) {
      welcome += ` I remember you! Last time we talked about ${memory.value.topicsDiscussed.slice(-2).join(' and ')}.`;
    }

    const welcomeMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: welcome,
      timestamp: Date.now(),
    };
    messages.value.push(welcomeMsg);

    await persistSession();
    speak(welcome);
  }

  async function loadActiveSession(): Promise<boolean> {
    const active = await getActiveSession();
    if (!active) return false;

    currentSessionId.value = active.id;
    currentTopic.value = active.topic;
    messages.value = [...active.messages];
    sessionScores.value = active.messages
      .filter(m => m.role === 'user' && m.evaluation)
      .map(m => m.evaluation!.fluencyScore);
    return true;
  }

  async function persistSession() {
    if (!currentSessionId.value || messages.value.length === 0) return;
    const avgScore = sessionScores.value.length > 0
      ? Math.round(sessionScores.value.reduce((a, b) => a + b, 0) / sessionScores.value.length)
      : 0;
    const session: TutorSession = {
      id: currentSessionId.value,
      startedAt: messages.value[0]?.timestamp || Date.now(),
      topic: currentTopic.value,
      messages: [...messages.value],
      avgFluencyScore: avgScore,
    };
    await saveSession(session);
  }

  async function sendMessage(audioBlob?: Blob, text?: string) {
    isLoading.value = true;
    let userText = text || '';

    if (audioBlob && !text) {
      try {
        userText = await transcribe(audioBlob);
      } catch {
        userText = '';
      }
    }

    if (!userText.trim()) {
      isLoading.value = false;
      return;
    }

    // Throttling: valuta solo ogni N messaggi utente
    const userMsgCount = messages.value.filter(m => m.role === 'user').length;
    const shouldEvaluate = (userMsgCount + 1) % EVALUATE_EVERY_N === 0;

    let evaluation = null;
    if (shouldEvaluate) {
      evaluation = await evaluate(userText);
      if (evaluation) {
        sessionScores.value.push(evaluation.fluencyScore);
      }
    }

    const userMsg: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: userText,
      evaluation: evaluation || undefined,
      timestamp: Date.now(),
    };
    messages.value.push(userMsg);
    await persistSession();

    // Message pruning per risparmio token
    const conversationMessages = pruneConversation(messages.value);

    // Contesto di memoria
    const memoryContext = memory.value
      ? `${memory.value.summary} Level: ${memory.value.level}. Recurrent errors: ${memory.value.recurrentErrors.join(', ') || 'none'}.`
      : '';

    try {
      const res = await fetch(`${API_URL}/api/conversation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversationMessages,
          level: evaluation?.levelEstimate || memory.value?.level || 'A1',
          context: memoryContext,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const assistantMsg: ConversationMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.reply || '...',
        timestamp: Date.now(),
      };

      if (data.correction) {
        assistantMsg.correction = data.correction as Correction;
        userMsg.correction = data.correction as Correction;
      }

      messages.value.push(assistantMsg);
      await persistSession();
      speak(data.reply);
    } catch (err) {
      messages.value.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        text: "I'm sorry, there was a connection error. Please try again.",
        timestamp: Date.now(),
      });
      await persistSession();
    } finally {
      isLoading.value = false;
    }
  }

  async function endSession() {
    if (!currentSessionId.value || messages.value.length === 0) return;

    const avgScore = sessionScores.value.length > 0
      ? Math.round(sessionScores.value.reduce((a, b) => a + b, 0) / sessionScores.value.length)
      : 0;

    const session: TutorSession = {
      id: currentSessionId.value,
      startedAt: messages.value[0]?.timestamp || Date.now(),
      endedAt: Date.now(),
      topic: currentTopic.value,
      messages: [...messages.value],
      avgFluencyScore: avgScore,
    };

    await saveSession(session);
    await endActiveSession(currentSessionId.value);

    // Genera e salva memoria a lungo termine
    const newContext = buildMemoryContext(session);
    const existing = memory.value;

    // Estrai errori ricorrenti da questa sessione
    const sessionErrors = new Map<string, number>();
    for (const m of session.messages) {
      if (m.correction?.issues) {
        for (const issue of m.correction.issues) {
          const key = issue.split(':')[0]?.trim() || issue;
          sessionErrors.set(key, (sessionErrors.get(key) || 0) + 1);
        }
      }
      if (m.evaluation?.grammarIssues) {
        for (const g of m.evaluation.grammarIssues) {
          const key = g.issue.split(':')[0]?.trim() || g.issue;
          sessionErrors.set(key, (sessionErrors.get(key) || 0) + 1);
        }
      }
    }

    const topSessionErrors = Array.from(sessionErrors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([e]) => e);

    const mergedErrors = Array.from(new Set([
      ...(existing?.recurrentErrors || []),
      ...topSessionErrors,
    ])).slice(0, 8);

    const mergedTopics = Array.from(new Set([
      ...(existing?.topicsDiscussed || []),
      session.topic,
    ])).slice(-10);

    const newMemory: UserMemory = {
      summary: newContext || existing?.summary || '',
      level: session.messages.find(m => m.evaluation?.levelEstimate)?.evaluation?.levelEstimate
        || existing?.level
        || 'A1',
      recurrentErrors: mergedErrors,
      topicsDiscussed: mergedTopics,
      totalMessages: (existing?.totalMessages || 0) + session.messages.filter(m => m.role === 'user').length,
      lastSessionAt: Date.now(),
    };

    await saveMemory(newMemory);
    console.log('[Tutor] Saved memory:', newMemory);

    await saveRecord({
      id: crypto.randomUUID(),
      type: 'tutor-session',
      startedAt: session.startedAt,
      completedAt: Date.now(),
      score: avgScore,
      transcript: messages.value.filter(m => m.role === 'user').map(m => m.text).join(' | '),
      feedback: `Topic: ${currentTopic.value}`,
    });

    currentSessionId.value = null;
    messages.value = [];
    sessionScores.value = [];
  }

  function getSessionAvgScore(): number {
    if (sessionScores.value.length === 0) return 0;
    return Math.round(sessionScores.value.reduce((a, b) => a + b, 0) / sessionScores.value.length);
  }

  return {
    messages,
    isLoading,
    currentTopic,
    startSession,
    sendMessage,
    endSession,
    getSessionAvgScore,
    loadActiveSession,
    cancel,
  };
}
