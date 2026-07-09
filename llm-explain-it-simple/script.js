// --- Dynamic Footer Year ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- YOUR GOOGLE GEMINI API KEY ---
const API_KEY = '__LLM_EXPLAIN_KEY__';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const API_KEY_PLACEHOLDERS = new Set(['', 'LLM_EXPLAIN_KEY', ['__', 'LLM_EXPLAIN_KEY', '__'].join('')]);

// --- Conversation History ---
const chatHistory = {
  kid: [],
  teen: []
};

let currentTopic = '';

// --- Enter Key Triggers ---
const input = document.getElementById('termInput');
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') explain();
});

const kidInput = document.getElementById('kidInput');
kidInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatMessage('kid');
});

const teenInput = document.getElementById('teenInput');
teenInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatMessage('teen');
});


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
function appendMessage(audience, role, text) {
  const chat = document.getElementById(`${audience}Chat`);
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chat.appendChild(bubble);
  chat.scrollTop = chat.scrollHeight;
}


// --- Main Explain Function ---
async function explain() {
  const term = input.value.trim();
  if (!term) return;

  currentTopic = term;
  const btn         = document.getElementById('explainBtn');
  const results     = document.getElementById('results');
  const resultsTerm = document.getElementById('resultsTerm');
  const kidChat     = document.getElementById('kidChat');
  const teenChat    = document.getElementById('teenChat');

  // Set loading state
  btn.disabled    = true;
  btn.textContent = 'Thinking...';

  // Clear previous chats
  kidChat.innerHTML = '';
  teenChat.innerHTML = '';
  chatHistory.kid = [];
  chatHistory.teen = [];

  results.classList.add('visible');
  resultsTerm.innerHTML = `Explaining: <span>${term}</span>`;

  // Show user message in both chats
  appendMessage('kid', 'user', term);
  appendMessage('teen', 'user', term);

  // Show typing indicators
  const kidTyping = document.createElement('div');
  kidTyping.className = 'typing-indicator';
  kidTyping.innerHTML = typingIndicator();
  kidChat.appendChild(kidTyping);
  kidChat.scrollTop = kidChat.scrollHeight;

  const teenTyping = document.createElement('div');
  teenTyping.className = 'typing-indicator';
  teenTyping.innerHTML = typingIndicator();
  teenChat.appendChild(teenTyping);
  teenChat.scrollTop = teenChat.scrollHeight;

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    const msg = 'Gemini API key is not configured. The GitHub Pages deploy must replace the API key placeholder in llm-explain-it-simple/script.js.';
    kidTyping.remove();
    teenTyping.remove();
    appendMessage('kid', 'model', msg);
    appendMessage('teen', 'model', msg);
    btn.disabled = false;
    btn.textContent = 'Explain It \u2193';
    return;
  }

  try {
    const [kidRes, teenRes] = await Promise.all([
      fetchChatResponse(term, 'kid'),
      fetchChatResponse(term, 'teen')
    ]);

    // Remove typing indicators
    kidTyping.remove();
    teenTyping.remove();

    // Append AI responses
    appendMessage('kid', 'model', kidRes);
    appendMessage('teen', 'model', teenRes);

    // Add system prompts to history
    const systemPrompts = {
      kid: 'You are a friendly assistant explaining tech concepts to a 10-year-old kid. Use very simple words, fun real-world analogies (toys, games, everyday experiences), and keep responses under 80 words. Be warm, clear, and encouraging. No jargon. No bullet points. Just one short paragraph.',
      teen: 'You are a friendly assistant explaining tech concepts to a 15-year-old teenager who is curious but not deeply technical. Use relatable analogies (apps, school, social media, everyday life), mention why the concept matters, and keep responses under 100 words. Be conversational and clear. No bullet points. Just one short paragraph.'
    };

    chatHistory.kid = [
      { role: 'user', parts: [{ text: systemPrompts.kid + '\n\nExplain: "' + term + '"' }] },
      { role: 'model', parts: [{ text: kidRes }] }
    ];
    chatHistory.teen = [
      { role: 'user', parts: [{ text: systemPrompts.teen + '\n\nExplain: "' + term + '"' }] },
      { role: 'model', parts: [{ text: teenRes }] }
    ];

  } catch (err) {
    console.error('Explain error:', err);
    kidTyping.remove();
    teenTyping.remove();
    const msg = err?.message || 'Something went wrong. Please try again.';
    appendMessage('kid', 'model', msg);
    appendMessage('teen', 'model', msg);
  }

  // Reset button
  btn.disabled    = false;
  btn.textContent = 'Explain It ↓';
}


// --- Send Chat Message ---
async function sendChatMessage(audience) {
  const inputEl = document.getElementById(`${audience}Input`);
  const message = inputEl.value.trim();
  if (!message) return;

  inputEl.value = '';
  appendMessage(audience, 'user', message);

  const chat = document.getElementById(`${audience}Chat`);
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = typingIndicator();
  chat.appendChild(typing);
  chat.scrollTop = chat.scrollHeight;

  const sendBtn = inputEl.nextElementSibling;
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  try {
    // Add user message to history
    chatHistory[audience].push({ role: 'user', parts: [{ text: message }] });

    const response = await fetchChatHistoryResponse(audience);

    typing.remove();
    appendMessage(audience, 'model', response);

    // Add model response to history
    chatHistory[audience].push({ role: 'model', parts: [{ text: response }] });

  } catch (err) {
    console.error('Chat error:', err);
    typing.remove();
    appendMessage(audience, 'model', err?.message || 'Something went wrong. Please try again.');
  }

  sendBtn.disabled = false;
  sendBtn.textContent = 'Send';
}


// --- Initial API Call (single prompt) ---
async function fetchChatResponse(term, audience) {
  const systemPrompts = {
    kid: 'You are a friendly assistant explaining tech concepts to a 10-year-old kid. Use very simple words, fun real-world analogies (toys, games, everyday experiences), and keep responses under 80 words. Be warm, clear, and encouraging. No jargon. No bullet points. Just one short paragraph.',
    teen: 'You are a friendly assistant explaining tech concepts to a 15-year-old teenager who is curious but not deeply technical. Use relatable analogies (apps, school, social media, everyday life), mention why the concept matters, and keep responses under 100 words. Be conversational and clear. No bullet points. Just one short paragraph.'
  };

  const prompt = systemPrompts[audience] + '\n\nExplain: "' + term + '"';

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
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
async function fetchChatHistoryResponse(audience) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: chatHistory[audience]
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
  document.getElementById('kidChat').innerHTML = '';
  document.getElementById('teenChat').innerHTML = '';
  chatHistory.kid = [];
  chatHistory.teen = [];
  document.getElementById('results').classList.remove('visible');
  document.getElementById('termInput').value = '';
  document.getElementById('termInput').focus();
}
