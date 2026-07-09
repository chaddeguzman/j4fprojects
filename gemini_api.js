// --- YOUR GOOGLE GEMINI API KEY ---
const API_KEY = 'INSERT_API_KEY';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const API_KEY_PLACEHOLDERS = new Set(['', 'GEMINI_API_KEY', 'INSERT_API_KEY', ['__', 'GEMINI_API_KEY', '__'].join('')]);

// --- Build Gemini Prompt ---
function buildPrompt(userInput) {
  // --- Custom Prompt Start ---
  // Replace this block when a future project needs its own reusable prompt.
  return `${userInput}`;
  // --- Custom Prompt End ---
}

// --- Parse Gemini JSON Response ---
function parseGeminiJson(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// --- Parse Gemini Text Response ---
function parseGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim() || '';
}
 
// --- Main Gemini Function ---
async function askGemini(prompt, options = {}) {
  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    throw new Error('Gemini API key is not configured. Replace INSERT_API_KEY before using gemini_api.js.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPrompt(prompt) }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {})
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('API error:', data);
    throw new Error(data?.error?.message || 'API request failed');
  }

  return data;
}

// --- Main Gemini Text Function ---
async function askGeminiText(prompt, options = {}) {
  const data = await askGemini(prompt, options);
  return parseGeminiText(data);
}

// --- Main Gemini JSON Function ---
async function askGeminiJson(prompt, options = {}) {
  const data = await askGemini(prompt, {
    ...options,
    responseMimeType: 'application/json'
  });

  return parseGeminiJson(data);
}

// --- Main Gemini Chat Function ---
function createGeminiChat(options = {}) {
  const history = [...(options.history || [])];

  return {
    history,
    async sendMessage(message) {
      history.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: history,
          generationConfig: {
            temperature: options.temperature ?? 0.2
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API error:', data);
        throw new Error(data?.error?.message || 'API request failed');
      }

      const reply = parseGeminiText(data);

      history.push({
        role: 'model',
        parts: [{ text: reply }]
      });

      return reply;
    }
  };
}

// --- Export for Browser, Node, or n8n ---
const GeminiApi = {
  API_KEY,
  API_URL,
  API_KEY_PLACEHOLDERS,
  buildPrompt,
  askGemini,
  askGeminiText,
  askGeminiJson,
  createGeminiChat,
  parseGeminiJson,
  parseGeminiText
};

if (typeof window !== 'undefined') {
  window.GeminiApi = GeminiApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiApi;
}
