// --- Dynamic Footer Year ---
document.getElementById('year').textContent = new Date().getFullYear();


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
    kidText.textContent  = 'Something went wrong. Please try again.';
    teenText.textContent = 'Something went wrong. Please try again.';
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompts[audience] }]
    })
  });

  const data = await response.json();
  return data.content?.[0]?.text || 'Could not generate explanation.';
}
