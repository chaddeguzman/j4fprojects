// --- Dynamic Footer Year ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- YOUR GOOGLE GEMINI API KEY ---
// Free key at: https://aistudio.google.com/apikey
const API_KEY = 'your-gemini-api-key-here';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

// --- Enter Key Trigger ---
const input = document.getElementById('termInput');
input.addEventListener('keydown', e => {
  if (e.key === 'Enter') explain();
});

// --- Example Chip Setter ---
function setExample(term) {
  input.value = term;
  input.focus();
}

// --- Loading HTML Helper ---
function loadingHTML(label) {
  return `<span class="loading">
    <span class="dots"><span></span><span></span><span></span></span>
    ${label}
  </span>`;
}

// --- Main Explain Function ---
async function explain() {
  const term = input.value.trim();
  if (!term) return;

  const btn         = document.getElementById('explainBtn');
  const results     = document.getElementById('results');
  const resultsTerm = document.getElementById('resultsTerm');
  const kidText     = document.getElementById('kidText');
  const teenText    = document.getElementById('teenText');

  // Set loading state
  btn.disabled    = true;
  btn.textContent = 'Thinking...';

  results.classList.add('visible');
  resultsTerm.innerHTML = `Explaining: <span>${term}</span>`;
  kidText.innerHTML     = loadingHTML('Thinking like a kid...');
  teenText.innerHTML    = loadingHTML('Thinking like a teen...');

  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const [kidRes, teenRes] = await Promise.all([
      fetchExplanation(term, 'kid'),
      fetchExplanation(term, 'teen')
    ]);

    kidText.classList.remove('loading');
    teenText.classList.remove('loading');
    kidText.textContent  = kidRes;
    teenText.textContent = teenRes;

  } catch (err) {
    console.error('Explain error:', err);
    const msg = err?.message || 'Something went wrong. Please try again.';
    kidText.textContent  = msg;
    teenText.textContent = msg;
  }

  // Reset button
  btn.disabled    = false;
  btn.textContent = 'Explain It ↓';
}

// --- API Call per Audience ---
async function fetchExplanation(term, audience) {
  const prompts = {
    kid: `You are explaining a tech concept to a 10-year-old kid. Use very simple words, a fun real-world analogy (like toys, games, or things kids experience), and keep it under 80 words. Be warm and clear. No jargon. No bullet points. Just one short paragraph. Explain: "${term}"`,
    teen: `You are explaining a tech concept to a 15-year-old teenager who is curious but not technical. Use a relatable analogy (like apps, school, social media, or everyday life), mention why it matters, and keep it under 100 words. Be conversational and clear. No bullet points. Just one short paragraph. Explain: "${term}"`
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: prompts[audience] }]
        }
      ]
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
