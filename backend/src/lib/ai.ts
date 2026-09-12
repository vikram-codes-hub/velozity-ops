/**
 * src/lib/ai.ts
 *
 * Central AI service for Velozity Ops.
 *
 * Strategy:
 *   1. Read keys dynamically from process.env on every call (handles runtime .env updates)
 *   2. Filter out placeholders ('REPLACE_WITH_...')
 *   3. Try Gemini keys (key 1 → 2 → 3) with fallback models (gemini-1.5-flash, gemini-2.0-flash, gemini-1.5-pro)
 *   4. Fallback to Grok / Groq / OpenAI keys (key 1 → 2 → 3) with key format auto-detection:
 *      - `gsk_...`: Groq Cloud (llama-3.3-70b-versatile, llama-3.1-8b-instant)
 *      - `xai-...`: xAI Grok (grok-beta, grok-2-latest)
 *      - `sk-...` : OpenAI (gpt-4o-mini, gpt-3.5-turbo)
 *   5. Detailed logging for each attempt & failure.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { ApiError } from '../middleware/errorHandler';

export interface AIResult {
  text: string;
  provider: 'gemini' | 'grok' | 'groq' | 'openai';
  keyIndex: number;
}

// ── Dynamic Key Helpers ────────────────────────────────────────────────────────

function getGeminiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter((k): k is string => !!k && k.trim().length > 0 && !k.includes('REPLACE_WITH'));
}

function getGrokKeys(): string[] {
  return [
    process.env.GROK_API_KEY_1,
    process.env.GROK_API_KEY_2,
    process.env.GROK_API_KEY_3,
  ].filter((k): k is string => !!k && k.trim().length > 0 && !k.includes('REPLACE_WITH'));
}

// ── Gemini Helper ─────────────────────────────────────────────────────────────

async function tryGemini(prompt: string): Promise<AIResult | null> {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  const modelsToTry = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    for (const modelName of modelsToTry) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        if (text && text.trim()) {
          console.log(`[AI] Gemini key #${i + 1} (${modelName}) succeeded`);
          return { text: text.trim(), provider: 'gemini', keyIndex: i + 1 };
        }
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.warn(`[AI] Gemini key #${i + 1} (${modelName}) failed: ${msg.slice(0, 120)}`);
      }
    }
  }
  return null;
}

// ── Grok / Groq / OpenAI Helper ───────────────────────────────────────────────

async function tryGrok(prompt: string): Promise<AIResult | null> {
  const keys = getGrokKeys();
  if (keys.length === 0) return null;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i].trim();

    // Auto-detect endpoint & primary models based on key prefix
    let baseURL = 'https://api.x.ai/v1';
    let models = ['grok-beta', 'grok-2-latest'];
    let providerName: 'grok' | 'groq' | 'openai' = 'grok';

    if (key.startsWith('gsk_')) {
      baseURL = 'https://api.groq.com/openai/v1';
      models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'];
      providerName = 'groq';
    } else if (key.startsWith('sk-')) {
      baseURL = 'https://api.openai.com/v1';
      models = ['gpt-4o-mini', 'gpt-3.5-turbo'];
      providerName = 'openai';
    }

    for (const modelName of models) {
      try {
        const client = new OpenAI({ apiKey: key, baseURL });
        const completion = await client.chat.completions.create({
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        });
        const text = completion.choices[0]?.message?.content ?? '';
        if (text && text.trim()) {
          console.log(`[AI] ${providerName.toUpperCase()} key #${i + 1} (${modelName}) succeeded`);
          return { text: text.trim(), provider: providerName, keyIndex: i + 1 };
        }
      } catch (err: any) {
        const msg = err?.message ?? String(err);
        console.warn(`[AI] ${providerName.toUpperCase()} key #${i + 1} (${modelName}) failed: ${msg.slice(0, 120)}`);
      }
    }
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generates text using the rotating-key strategy.
 * Dynamic execution, model fallback & automatic provider detection.
 */
export async function generateWithFallback(prompt: string): Promise<AIResult> {
  const geminiCount = getGeminiKeys().length;
  const grokCount = getGrokKeys().length;

  if (geminiCount === 0 && grokCount === 0) {
    throw new ApiError(
      400,
      'AI_NOT_CONFIGURED',
      'No AI API keys configured. Please add valid GEMINI_API_KEY_1 or GROK_API_KEY_1 to backend/.env'
    );
  }

  // 1. Try Gemini pool
  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult;

  // 2. Try Grok / Groq / OpenAI pool
  const grokResult = await tryGrok(prompt);
  if (grokResult) return grokResult;

  // 3. Fallback exhausted
  throw new ApiError(
    503,
    'AI_UNAVAILABLE',
    'AI providers rejected the API keys or were unreachable. Please verify your keys in backend/.env.'
  );
}

