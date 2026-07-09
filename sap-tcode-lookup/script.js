// --- Dynamic Footer Year ---
document.getElementById('year').textContent = new Date().getFullYear();

// --- YOUR GOOGLE GEMINI API KEY ---
const API_KEY = '__GEMINI_API_KEY__';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const API_KEY_PLACEHOLDERS = new Set(['', 'GEMINI_API_KEY', '__GEMINI_API_KEY__']);

// --- Input: Auto-Uppercase & Enter Key ---
const input = document.getElementById('tcodeInput');

input.addEventListener('input', () => {
  input.value = input.value.toUpperCase();
});

input.addEventListener('keydown', e => {
  if (e.key === 'Enter') lookup();
});

// --- Example Chip Setter ---
function setExample(tcode) {
  input.value = tcode;
  input.focus();
}

// --- Loading Dots HTML Helper ---
function loadingDots(label) {
  return `<span class="loading">
    <span class="dots"><span></span><span></span><span></span></span>
    ${label}
  </span>`;
}

// --- Reset All Fields to Loading State ---
function setLoadingState(tcode) {
  document.getElementById('badgeTcode').textContent = tcode;
  document.getElementById('headerWhat').innerHTML = loadingDots('');
  document.getElementById('headerModule').textContent = 'Loading...';
  document.getElementById('detailWhat').innerHTML = loadingDots('Fetching details...');
  document.getElementById('detailModule').innerHTML = loadingDots('Fetching module...');
  document.getElementById('detailUsecase').innerHTML = loadingDots('Fetching use case...');
  document.getElementById('detailAbap').innerHTML = loadingDots('Fetching program...');
}

// --- Render Results into DOM ---
function renderResult(info) {
  document.getElementById('headerWhat').textContent = info.short_description || '-';
  document.getElementById('headerModule').textContent = info.module_code || '-';
  document.getElementById('detailWhat').textContent = info.what_it_does || '-';
  document.getElementById('detailModule').innerHTML =
    `<strong style="color: var(--ink); font-weight: 500;">${info.module_code || '-'}</strong> - ${info.module || '-'}`;
  document.getElementById('detailUsecase').textContent = info.use_case || '-';
  document.getElementById('detailAbap').innerHTML =
    `<code>${info.abap_program || '-'}</code><br>${info.abap_note || ''}`;
}

// --- Render Error State ---
function renderError(message = 'Something went wrong. Please try again.') {
  document.getElementById('headerWhat').textContent = 'Error fetching data.';
  document.getElementById('headerModule').textContent = '-';
  document.getElementById('detailWhat').textContent = message;
  document.getElementById('detailModule').textContent = '-';
  document.getElementById('detailUsecase').textContent = '-';
  document.getElementById('detailAbap').textContent = '-';
}

// --- Build Gemini Prompt ---
function buildPrompt(tcode) {
  return `You are an SAP expert. The user wants to look up the SAP transaction code: "${tcode}".

Respond ONLY with a valid JSON object and nothing else. No markdown, no backticks, no explanation outside the JSON.

Use this exact structure:
{
  "tcode": "${tcode}",
  "short_description": "One sentence, what this t-code does (10-15 words max)",
  "module": "SAP module full name, e.g. Materials Management (MM)",
  "module_code": "Two-letter code e.g. MM, FI, HR, SD, PM",
  "what_it_does": "2-3 sentences describing the full function and purpose of this t-code",
  "use_case": "A realistic 2-3 sentence real-world scenario of how a business user would use this t-code",
  "abap_program": "The main ABAP program or function module name behind this t-code, e.g. SAPMM06E. If multiple, list the primary one first.",
  "abap_note": "One sentence describing what the ABAP program does technically"
}

If the t-code is invalid or unknown, still return the JSON but set short_description to "Unknown or unrecognized T-Code" and leave other fields as empty strings.`;
}

// --- Main Lookup Function ---
async function lookup() {
  const tcode = input.value.trim().toUpperCase();
  if (!tcode) return;

  const btn = document.getElementById('lookupBtn');
  const wrap = document.getElementById('resultWrap');

  // Set loading state
  btn.disabled = true;
  btn.textContent = 'Looking up...';

  setLoadingState(tcode);
  wrap.classList.add('visible');
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    renderError('Gemini API key is not configured. The GitHub Pages deploy must replace __GEMINI_API_KEY__ in sap-tcode-lookup/script.js.');
    btn.disabled = false;
    btn.textContent = 'Look Up \u2193';
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: buildPrompt(tcode) }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('API error:', data);
      throw new Error(data?.error?.message || 'API request failed');
    }

    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const clean = raw.replace(/```json|```/g, '').trim();
    const info = JSON.parse(clean);

    renderResult(info);
  } catch (err) {
    console.error('Lookup error:', err);
    renderError(err.message || 'Something went wrong. Please try again.');
  }

  // Reset button
  btn.disabled = false;
  btn.textContent = 'Look Up \u2193';
}
