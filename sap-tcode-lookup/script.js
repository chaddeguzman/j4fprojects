const GEMINI_API_KEY_PLACEHOLDER = '__GEMINI_API_KEY__';
const GEMINI_MODEL = 'gemini-2.5-flash';

document.getElementById('year').textContent = new Date().getFullYear();

const input = document.getElementById('tcodeInput');
const lookupBtn = document.getElementById('lookupBtn');
const resultWrap = document.getElementById('resultWrap');

input.addEventListener('input', () => {
  input.value = input.value.toUpperCase();
});

input.addEventListener('keydown', event => {
  if (event.key === 'Enter') lookup();
});

function getGeminiApiKey() {
  const configuredKey = window.SAP_TCODE_CONFIG?.geminiApiKey?.trim() || '';

  if (!configuredKey || configuredKey === GEMINI_API_KEY_PLACEHOLDER || configuredKey === 'GEMINI_API_KEY') {
    return '';
  }

  return configuredKey;
}

function getGeminiApiUrl(apiKey) {
  const encodedKey = encodeURIComponent(apiKey);
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodedKey}`;
}

function setExample(tcode) {
  input.value = tcode;
  input.focus();
}

function loadingDots(label) {
  return `<span class="loading">
    <span class="dots"><span></span><span></span><span></span></span>
    ${label}
  </span>`;
}

function setLoadingState(tcode) {
  document.getElementById('badgeTcode').textContent = tcode;
  document.getElementById('headerWhat').innerHTML = loadingDots('');
  document.getElementById('headerModule').textContent = 'Loading...';
  document.getElementById('detailWhat').innerHTML = loadingDots('Fetching details...');
  document.getElementById('detailModule').innerHTML = loadingDots('Fetching module...');
  document.getElementById('detailUsecase').innerHTML = loadingDots('Fetching use case...');
  document.getElementById('detailAbap').innerHTML = loadingDots('Fetching program...');
}

function setText(id, value, fallback = '-') {
  document.getElementById(id).textContent = value || fallback;
}

function renderModule(info) {
  const moduleEl = document.getElementById('detailModule');
  moduleEl.textContent = '';

  const codeEl = document.createElement('strong');
  codeEl.style.color = 'var(--ink)';
  codeEl.style.fontWeight = '500';
  codeEl.textContent = info.module_code || '-';

  moduleEl.append(codeEl, ` - ${info.module || '-'}`);
}

function renderAbap(info) {
  const abapEl = document.getElementById('detailAbap');
  abapEl.textContent = '';

  const codeEl = document.createElement('code');
  codeEl.textContent = info.abap_program || '-';

  abapEl.append(codeEl);

  if (info.abap_note) {
    abapEl.append(document.createElement('br'), info.abap_note);
  }
}

function renderResult(info) {
  setText('headerWhat', info.short_description);
  setText('headerModule', info.module_code);
  setText('detailWhat', info.what_it_does);
  setText('detailUsecase', info.use_case);
  renderModule(info);
  renderAbap(info);
}

function renderError(message = 'Something went wrong. Please try again.') {
  setText('headerWhat', 'Error fetching data.');
  setText('headerModule', '-');
  setText('detailWhat', message);
  setText('detailModule', '-');
  setText('detailUsecase', '-');
  setText('detailAbap', '-');
}

function buildPrompt(tcode) {
  return `You are an SAP expert. The user wants to look up the SAP transaction code: "${tcode}".

Respond only with a valid JSON object. Do not include markdown, backticks, or explanation outside the JSON.

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

function parseGeminiJson(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = raw.replace(/```json|```/gi, '').trim();
  return JSON.parse(clean);
}

async function lookup() {
  const tcode = input.value.trim().toUpperCase();
  if (!tcode) return;

  const apiKey = getGeminiApiKey();

  lookupBtn.disabled = true;
  lookupBtn.textContent = 'Looking up...';

  setLoadingState(tcode);
  resultWrap.classList.add('visible');
  resultWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!apiKey) {
    renderError('Gemini API key is not configured. Replace __GEMINI_API_KEY__ during your GitHub Pages deploy using the GEMINI_API_KEY secret.');
    lookupBtn.disabled = false;
    lookupBtn.textContent = 'Look Up \u2193';
    return;
  }

  try {
    const response = await fetch(getGeminiApiUrl(apiKey), {
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
      console.error('Gemini API error:', data);
      throw new Error(data?.error?.message || 'Gemini API request failed.');
    }

    renderResult(parseGeminiJson(data));
  } catch (error) {
    console.error('Lookup error:', error);
    renderError(error.message || 'Something went wrong. Please try again.');
  }

  lookupBtn.disabled = false;
  lookupBtn.textContent = 'Look Up \u2193';
}
