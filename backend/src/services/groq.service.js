import { env } from '../config/env.js';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 20000;

export class GroqServiceError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'GroqServiceError';
    this.reason = reason;
  }
}

export const isGroqConfigured = () => Boolean(env.groqApiKey && env.groqApiKey.trim().length > 0);

const stripCodeFences = (text) => {
  const trimmed = text.trim();
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```[a-zA-Z0-9]*\n?/, '')
      .replace(/```\s*$/, '')
      .trim();
  }
  return trimmed;
};

export const requestStudyPlanCompletion = async ({ systemPrompt, userPrompt }) => {
  if (!isGroqConfigured()) {
    throw new GroqServiceError('missing_api_key', 'Groq API key is not configured');
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.groqApiKey}`,
      },
      body: JSON.stringify({
        model: env.groqModel,
        temperature: 0.2,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new GroqServiceError('timeout', 'Groq API request timed out');
    }
    throw new GroqServiceError('network_error', 'Failed to reach Groq API');
  } finally {
    clearTimeout(timeoutHandle);
  }

  if (response.status === 401 || response.status === 403) {
    throw new GroqServiceError('unauthorized', 'Groq API rejected the configured credentials');
  }

  if (response.status === 429) {
    throw new GroqServiceError('rate_limited', 'Groq API rate limit reached');
  }

  if (!response.ok) {
    throw new GroqServiceError('api_error', `Groq API returned status ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw new GroqServiceError('invalid_response', 'Groq API returned a non-JSON response');
  }

  const content = payload?.choices?.[0]?.message?.content;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new GroqServiceError('empty_response', 'Groq API returned an empty response');
  }

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(content));
  } catch (err) {
    throw new GroqServiceError('malformed_json', 'Groq API response was not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GroqServiceError('unexpected_output', 'Groq API response was not a JSON object');
  }

  return parsed;
};
