// --- Gemini API Configuration ---
const API_KEY = '__LLM_EXPLAIN_KEY__';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const API_KEY_PLACEHOLDERS = new Set(['', 'LLM_EXPLAIN_KEY', ['__', 'LLM_EXPLAIN_KEY', '__'].join('')]);

// --- Audience Foundations ---
const audienceProfiles = {
  child: {
    label: 'Child Explanation',
    systemPrompt: 'You are a friendly assistant explaining tech concepts to a 10-year-old child. Use very simple words, fun real-world analogies like toys, games, and everyday experiences, and keep responses under 80 words. Be warm, clear, and encouraging. No jargon. No bullet points. Just one short paragraph.'
  },
  teen: {
    label: 'Teen Explanation',
    systemPrompt: 'You are a friendly assistant explaining tech concepts to a 15-year-old teenager who is curious but not deeply technical. Use relatable analogies from apps, school, social media, and everyday life. Mention why the concept matters, and keep responses under 100 words. Be conversational and clear. No bullet points. Just one short paragraph.'
  },
  adult: {
    label: 'Adult Explanation',
    systemPrompt: 'You are a practical assistant explaining technical concepts to an adult beginner. Use plain language, define key terms briefly, include a realistic use case, and keep responses under 130 words. Be direct, useful, and easy to follow. No bullet points unless the user asks for them.'
  }
};

// --- DOM References ---
const input = document.getElementById('termInput');
const explainBtn = document.getElementById('explainBtn');
const results = document.getElementById('results');
const resultsTerm = document.getElementById('resultsTerm');
const audienceLabel = document.getElementById('audienceLabel');
const chat = document.getElementById('mainChat');
const chatInput = document.getElementById('chatInput');

// --- Chat State ---
let currentAudience = 'child';
let currentTopic = '';
let chatHistory = [];

// --- Initial Setup ---
document.getElementById('year').textContent = new Date().getFullYear();

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') explain();
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatMessage();
});

// --- Audience Selector ---
function setAudience(audience) {
  currentAudience = audienceProfiles[audience] ? audience : 'child';
  audienceLabel.textContent = audienceProfiles[currentAudience].label;

  document.querySelectorAll('.audience-chip').forEach(button => {
    button.classList.toggle('selected', button.dataset.audience === currentAudience);
  });
}

// --- Example Chip Setter ---
function setExample(term) {
  input.value = term;
  input.focus();
}

// --- Typing Indicator ---
function typingIndicator() {
  return `<div class="typing-indicator">
    <span class="dots"><span></span><span></span><span></span></span>
    <span class="typing-text">Thinking...</span>
  </div>`;
}

// --- Message Bubble Builder ---
function appendMessage(role, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}

function addTypingIndicator() {
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = typingIndicator();
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;
  return typing;
}

function getFoundationPrompt(term) {
  return `${audienceProfiles[currentAudience].systemPrompt}\n\nExplain: "${term}"`;
}

function getApiKeyMessage() {
  return 'Gemini API key is not configured. The GitHub Pages deploy must replace the API key placeholder in llm-explain-it-simple/script.js.';
}

function resetExplainButton() {
  explainBtn.disabled = false;
  explainBtn.textContent = 'Explain It \u2193';
}

// --- Main Explain Function ---
async function explain() {
  const term = input.value.trim();
  if (!term) return;

  currentTopic = term;
  chatHistory = [];
  chat.innerHTML = '';

  explainBtn.disabled = true;
  explainBtn.textContent = 'Thinking...';

  results.classList.add('visible');
  resultsTerm.innerHTML = `Explaining for ${audienceProfiles[currentAudience].label}: <span>${term}</span>`;
  appendMessage('user', term);

  const typing = addTypingIndicator();
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    typing.remove();
    appendMessage('model', getApiKeyMessage());
    resetExplainButton();
    return;
  }

  try {
    const response = await fetchChatResponse(term);

    typing.remove();
    appendMessage('model', response);

    chatHistory = [
      { role: 'user', parts: [{ text: getFoundationPrompt(term) }] },
      { role: 'model', parts: [{ text: response }] }
    ];
  } catch (err) {
    console.error('Explain error:', err);
    typing.remove();
    appendMessage('model', err?.message || 'Something went wrong. Please try again.');
  }

  resetExplainButton();
}

// --- Send Chat Message ---
async function sendChatMessage() {
  const message = chatInput.value.trim();
  if (!message) return;

  chatInput.value = '';
  appendMessage('user', message);

  const typing = addTypingIndicator();
  const sendBtn = chatInput.nextElementSibling;
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    typing.remove();
    appendMessage('model', getApiKeyMessage());
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
    return;
  }

  try {
    chatHistory.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetchChatHistoryResponse();

    typing.remove();
    appendMessage('model', response);
    chatHistory.push({ role: 'model', parts: [{ text: response }] });
  } catch (err) {
    console.error('Chat error:', err);
    typing.remove();
    appendMessage('model', err?.message || 'Something went wrong. Please try again.');
  }

  sendBtn.disabled = false;
  sendBtn.textContent = 'Send';
}

// --- Initial API Call (single prompt) ---
async function fetchChatResponse(term) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: getFoundationPrompt(term) }] }]
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    console.error('API error:', errData);
    throw new Error(errData?.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate explanation.';
}

// --- Follow-up API Call (with history) ---
async function fetchChatHistoryResponse() {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: chatHistory
    })
  });

  if (!response.ok) {
    const errData = await response.json();
    console.error('API error:', errData);
    throw new Error(errData?.error?.message || 'API request failed');
  }

  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate a response.';
}

// --- Clear Chat ---
function clearChat() {
  chat.innerHTML = '';
  chatHistory = [];
  currentTopic = '';
  results.classList.remove('visible');
  input.value = '';
  input.focus();
}
