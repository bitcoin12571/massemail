const DEFAULT_ENDPOINT = 'https://claude.ai-platform.space/v1/chat/completions';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const REQUEST_TIMEOUT_MS = 30000;

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) throw new Error('AI returned an invalid response');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export async function improveEmail({ subject, message, language = 'en' }) {
  const apiKey = process.env.CLAUDE_PROXY_API_KEY;
  if (!apiKey) {
    const error = new Error('AI rewriting is not configured');
    error.status = 503;
    throw error;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(process.env.CLAUDE_PROXY_URL || DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_PROXY_MODEL || DEFAULT_MODEL,
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          {
            role: 'system',
            content: [
              'You are an expert business email editor.',
              'Improve clarity, grammar, professionalism, warmth, and persuasiveness without inventing facts.',
              'Preserve the original intent, names, dates, prices, links, placeholders, and calls to action.',
              `Write in the same language as the draft. The interface language is ${language}.`,
              'Return only valid JSON with exactly two string properties: "subject" and "message".'
            ].join(' ')
          },
          {
            role: 'user',
            content: `Subject:\n${subject || '(empty)'}\n\nMessage:\n${message}`
          }
        ]
      }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const upstreamMessage = payload?.error?.message || payload?.message;
      throw new Error(upstreamMessage || `AI provider returned ${response.status}`);
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('AI provider returned no rewritten email');
    }

    const improved = extractJson(content);
    if (typeof improved.subject !== 'string' || typeof improved.message !== 'string') {
      throw new Error('AI returned an incomplete email');
    }

    return {
      subject: improved.subject.trim().slice(0, 300),
      message: improved.message.trim().slice(0, 20000)
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('AI request timed out');
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
