// Mistral wrapper with primary→backup key fallback, retries and 20s timeout.

import type { ChatTurn } from './types';

const PRIMARY = process.env.MISTRAL_API_KEY_PRIMARY ?? '';
const BACKUP = process.env.MISTRAL_API_KEY_BACKUP ?? '';
const MODEL_FAST = process.env.MISTRAL_MODEL_FAST ?? 'mistral-small-latest';
const MODEL_HARD = process.env.MISTRAL_MODEL_HARD ?? 'mistral-large-latest';

export type MistralMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface LlmOptions {
  model?: 'fast' | 'hard';
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

interface MistralChoice {
  message: { role: string; content: string };
  finish_reason?: string;
}
interface MistralResponse {
  choices: MistralChoice[];
}

async function callOnce(
  apiKey: string,
  model: string,
  messages: MistralMessage[],
  opts: LlmOptions,
): Promise<string> {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20_000);
  try {
    const body: Record<string, unknown> = {
      model,
      messages,
      temperature: opts.temperature ?? 0.4,
      max_tokens: opts.maxTokens ?? 1500,
    };
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Mistral ${res.status}: ${text.slice(0, 200)}`);
    }
    const data = (await res.json()) as MistralResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Mistral: empty content');
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function llmChat(messages: MistralMessage[], opts: LlmOptions = {}): Promise<string> {
  const model = opts.model === 'hard' ? MODEL_HARD : MODEL_FAST;
  const keys = [PRIMARY, BACKUP].filter(Boolean);
  if (keys.length === 0) throw new Error('No Mistral API keys configured');

  let lastErr: unknown = null;
  for (const key of keys) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callOnce(key, model, messages, opts);
      } catch (e) {
        lastErr = e;
        // small backoff
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Mistral failed');
}

export function turnsToMistral(history: ChatTurn[]): MistralMessage[] {
  return history.map((t) => ({ role: t.role === 'system' ? 'system' : t.role, content: t.content }));
}

export async function llmJson<T>(
  messages: MistralMessage[],
  opts: Omit<LlmOptions, 'json'> = {},
): Promise<T> {
  const text = await llmChat(messages, { ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    // Try to recover JSON from a noisy answer
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error('Mistral: invalid JSON response');
  }
}
