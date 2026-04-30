import { ref } from 'vue';
import type { Evaluation } from '../types';

const API_URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '';

const isEvaluating = ref(false);
const lastEvaluation = ref<Evaluation | null>(null);

export function useEvaluator() {
  async function evaluate(text: string, context?: string): Promise<Evaluation | null> {
    isEvaluating.value = true;
    try {
      const res = await fetch(`${API_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      lastEvaluation.value = data;
      return data;
    } catch (err) {
      console.error('Evaluation error:', err);
      return null;
    } finally {
      isEvaluating.value = false;
    }
  }

  return {
    isEvaluating,
    lastEvaluation,
    evaluate,
  };
}
