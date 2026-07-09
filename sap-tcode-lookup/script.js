// --- Gemini API Configuration ---
const API_KEY = '__TCODE_API__';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const API_KEY_PLACEHOLDERS = new Set(['', 'TCODE_API', ['__', 'TCODE_API', '__'].join('')]);

// --- DOM References ---
const input = document.getElementById('tcodeInput');
const lookupBtn = document.getElementById('lookupBtn');
const resultWrap = document.getElementById('resultWrap');
const fields = {
  year: document.getElementById('year'),
  badgeTcode: document.getElementById('badgeTcode'),
  headerWhat: document.getElementById('headerWhat'),
  headerModule: document.getElementById('headerModule'),
  detailWhat: document.getElementById('detailWhat'),
  detailModule: document.getElementById('detailModule'),
  detailUsecase: document.getElementById('detailUsecase'),
  detailAbap: document.getElementById('detailAbap')
};

// --- Initial Setup ---
fields.year.textContent = new Date().getFullYear();

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
  fields.badgeTcode.textContent = tcode;
  fields.headerWhat.innerHTML = loadingDots('');
  fields.headerModule.textContent = 'Loading...';
  fields.detailWhat.innerHTML = loadingDots('Fetching details...');
  fields.detailModule.innerHTML = loadingDots('Fetching module...');
  fields.detailUsecase.innerHTML = loadingDots('Fetching use case...');
  fields.detailAbap.innerHTML = loadingDots('Fetching program...');
}

// --- Render Results into DOM ---
function renderResult(info) {
  fields.headerWhat.textContent = info.short_description || '-';
  fields.headerModule.textContent = info.module_code || '-';
  fields.detailWhat.textContent = info.what_it_does || '-';
  fields.detailModule.innerHTML =
    `<strong style="color: var(--ink); font-weight: 500;">${info.module_code || '-'}</strong> - ${info.module || '-'}`;
  fields.detailUsecase.textContent = info.use_case || '-';
  fields.detailAbap.innerHTML =
    `<code>${info.abap_program || '-'}</code><br>${info.abap_note || ''}`;
}

// --- Render Error State ---
function renderError(message = 'Something went wrong. Please try again.') {
  fields.headerWhat.textContent = 'Error fetching data.';
  fields.headerModule.textContent = '-';
  fields.detailWhat.textContent = message;
  fields.detailModule.textContent = '-';
  fields.detailUsecase.textContent = '-';
  fields.detailAbap.textContent = '-';
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

  // Set loading state
  lookupBtn.disabled = true;
  lookupBtn.textContent = 'Looking up...';

  setLoadingState(tcode);
  resultWrap.classList.add('visible');
  resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    renderError('Gemini API key is not configured. The GitHub Pages deploy must replace the API key placeholder in sap-tcode-lookup/script.js.');
    lookupBtn.disabled = false;
    lookupBtn.textContent = 'Look Up \u2193';
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
  lookupBtn.disabled = false;
  lookupBtn.textContent = 'Look Up \u2193';
}
