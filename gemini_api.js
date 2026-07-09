/*
  Reusable Gemini API helper for static websites and JavaScript apps.

  Browser usage:
    <script src="../gemini_api.js"></script>
    const key = GeminiApi.getApiKey(window.MY_CONFIG);
    const gemini = GeminiApi.createClient({ apiKey: key });
    const reply = await gemini.generateText({ prompt: 'Hello' });

  Local Node or n8n Code node usage:
    const GeminiApi = require('./gemini_api.js');
    const gemini = GeminiApi.createClient({ apiKey: process.env.GEMINI_API_KEY });
    const reply = await gemini.generateText({ prompt: 'Hello' });

  Chatbot usage:
    const chat = gemini.createChat({ systemInstruction: 'Be helpful and concise.' });
    const reply = await chat.sendMessage('What can you do?');
*/
(function (global) {
  const DEFAULT_MODEL = 'gemini-2.5-flash';
  const DEFAULT_API_VERSION = 'v1beta';
  const API_KEY_PLACEHOLDERS = new Set([
    '',
    '__GEMINI_API_KEY__',
    'GEMINI_API_KEY'
  ]);

  function getApiKey(config, keyName = 'geminiApiKey') {
    const configuredKey = config?.[keyName]?.trim?.() || '';
    return API_KEY_PLACEHOLDERS.has(configuredKey) ? '' : configuredKey;
  }

  function getEnvironmentApiKey() {
    if (typeof process === 'undefined') return '';
    return process.env?.GEMINI_API_KEY?.trim?.() || '';
  }

  function resolveApiKey(options = {}) {
    return getApiKey({ geminiApiKey: options.apiKey })
      || getApiKey(options.config, options.keyName || 'geminiApiKey')
      || getEnvironmentApiKey();
  }

  function buildGenerateContentUrl(apiKey, options = {}) {
    const model = options.model || DEFAULT_MODEL;
    const apiVersion = options.apiVersion || DEFAULT_API_VERSION;
    const encodedKey = encodeURIComponent(apiKey);

    return `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${encodedKey}`;
  }

  function getTextFromResponse(data) {
    return data?.candidates?.[0]?.content?.parts
      ?.map(part => part.text || '')
      .join('')
      .trim() || '';
  }

  function parseJsonText(text) {
    const clean = text.replace(/```json|```/gi, '').trim();
    return JSON.parse(clean);
  }

  function createError(message, response, data) {
    const error = new Error(message);
    error.status = response?.status;
    error.statusText = response?.statusText;
    error.data = data;
    return error;
  }

  function createClient(options = {}) {
    const apiKey = resolveApiKey(options);
    const model = options.model || DEFAULT_MODEL;
    const apiVersion = options.apiVersion || DEFAULT_API_VERSION;

    async function generateContent(request = {}) {
      if (!apiKey) {
        throw createError('Gemini API key is not configured.');
      }

      const contents = request.contents || [
        {
          role: 'user',
          parts: [{ text: request.prompt || '' }]
        }
      ];

      const body = {
        contents,
        generationConfig: {
          temperature: 0.2,
          ...(request.generationConfig || {})
        }
      };

      if (request.systemInstruction) {
        body.systemInstruction = {
          parts: [{ text: request.systemInstruction }]
        };
      }

      const response = await fetch(buildGenerateContentUrl(apiKey, { model, apiVersion }), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw createError(data?.error?.message || 'Gemini API request failed.', response, data);
      }

      return data;
    }

    async function generateText(request = {}) {
      const data = await generateContent(request);
      return getTextFromResponse(data);
    }

    async function generateJson(request = {}) {
      const text = await generateText({
        ...request,
        generationConfig: {
          responseMimeType: 'application/json',
          ...(request.generationConfig || {})
        }
      });

      return parseJsonText(text);
    }

    function createChat(chatOptions = {}) {
      const history = [...(chatOptions.history || [])];
      const systemInstruction = chatOptions.systemInstruction;

      return {
        history,
        async sendMessage(message, requestOptions = {}) {
          history.push({
            role: 'user',
            parts: [{ text: message }]
          });

          const text = await generateText({
            ...requestOptions,
            contents: history,
            systemInstruction: requestOptions.systemInstruction || systemInstruction
          });

          history.push({
            role: 'model',
            parts: [{ text }]
          });

          return text;
        }
      };
    }

    return {
      generateContent,
      generateText,
      generateJson,
      createChat
    };
  }

  global.GeminiApi = {
    DEFAULT_MODEL,
    getApiKey,
    resolveApiKey,
    createClient,
    getTextFromResponse,
    parseJsonText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = global.GeminiApi;
  }
})(typeof window !== 'undefined' ? window : globalThis);
