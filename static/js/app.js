/**
 * PRISM Recommendation System — app.js
 * Handles: category selection, preference chips, API calls, result rendering
 */

// ─── State ────────────────────────────────────────────────────────────────────
let selectedCategory = null;
let selections       = {};

// ─── Preference Options ───────────────────────────────────────────────────────
const OPTIONS = {
  movies: {
    genre:    { label: "Genre",    opts: ["sci-fi","drama","thriller","comedy","romance","action","animation"] },
    mood:     { label: "Mood",     opts: ["mind-bending","inspiring","dark","whimsical","epic","intense","entertaining","humorous"] },
    era:      { label: "Era",      opts: ["classic","modern"] },
    duration: { label: "Length",   opts: ["short","medium","long"] },
    language: { label: "Language", opts: ["english","foreign","any"] },
  },
  books: {
    genre:  { label: "Genre",        opts: ["sci-fi","fantasy","non-fiction","dystopian","self-help","literary-fiction","mystery","memoir"] },
    mood:   { label: "Mood",         opts: ["epic","informative","humorous","dark","motivating","melancholic","hopeful","inspiring"] },
    length: { label: "Length",       opts: ["short","medium","long"] },
    pace:   { label: "Reading Pace", opts: ["slow","medium","fast"] },
    era:    { label: "Era",          opts: ["classic","modern"] },
  },
  travel: {
    type:     { label: "Trip Type",    opts: ["cultural","scenic","adventure","wellness","urban","beach"] },
    climate:  { label: "Climate",      opts: ["temperate","mediterranean","cold","hot","tropical"] },
    budget:   { label: "Budget",       opts: ["low","medium","high"] },
    pace:     { label: "Travel Pace",  opts: ["relaxed","active","fast"] },
    duration: { label: "Duration",     opts: ["weekend","week","two-weeks"] },
  },
};

// ─── Category Selection ───────────────────────────────────────────────────────
function selectCategory(cat, el) {
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selectedCategory = cat;
  document.getElementById('btn-to-prefs').disabled = false;
}

// ─── Build Preference Form ────────────────────────────────────────────────────
function buildPreferenceForm(category) {
  const form = document.getElementById('pref-form');
  form.innerHTML = '';

  const grid = document.createElement('div');
  grid.className = 'pref-grid';

  const opts = OPTIONS[category];
  for (const [key, config] of Object.entries(opts)) {
    const group = document.createElement('div');
    group.className = 'pref-group';

    const label = document.createElement('div');
    label.className = 'pref-label';
    label.textContent = config.label;
    group.appendChild(label);

    const chipsWrap = document.createElement('div');
    chipsWrap.className = 'chip-group';

    config.opts.forEach(opt => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent = opt;
      chip.dataset.key = key;
      chip.dataset.val = opt;
      chip.addEventListener('click', () => selectChip(chip, key, opt));
      chipsWrap.appendChild(chip);
    });

    group.appendChild(chipsWrap);
    grid.appendChild(group);
  }

  form.appendChild(grid);
}

// ─── Chip Toggle ─────────────────────────────────────────────────────────────
function selectChip(el, key, val) {
  document.querySelectorAll(`.chip[data-key="${key}"]`).forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  selections[key] = val;
}

// ─── Navigation: Step 1 → Step 2 ─────────────────────────────────────────────
function goToPrefs() {
  if (!selectedCategory) return;
  selections = {};

  const titles = {
    movies: '🎬  Movie Preferences',
    books:  '📚  Book Preferences',
    travel: '✈️  Travel Preferences',
  };
  document.getElementById('pref-title').textContent = titles[selectedCategory];

  buildPreferenceForm(selectedCategory);
  document.getElementById('error-box').style.display = 'none';

  showSection('s2');
  updateSteps(2);
}

// ─── Navigation: Back to Step 1 ──────────────────────────────────────────────
function goBack() {
  showSection('s1');
  updateSteps(1);
}

// ─── Submit Preferences ───────────────────────────────────────────────────────
async function submitPrefs() {
  const required = Object.keys(OPTIONS[selectedCategory]);
  const missing  = required.filter(k => !selections[k]);

  const errorBox = document.getElementById('error-box');
  if (missing.length > 0) {
    const missingLabels = missing.map(m => OPTIONS[selectedCategory][m].label).join(', ');
    errorBox.textContent = `⚠  Please select an option for: ${missingLabels}`;
    errorBox.style.display = 'block';
    return;
  }
  errorBox.style.display = 'none';

  // Show loading state
  showSection(null);
  document.getElementById('loading').style.display = 'block';

  try {
    const response = await fetch('/recommend', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category:    selectedCategory,
        preferences: selections,
        top_n:       5,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || 'Server returned an error');
    }

    const data = await response.json();
    renderResults(data);

  } catch (e) {
    document.getElementById('loading').style.display = 'none';
    showSection('s2');
    errorBox.textContent = `⚠  Error: ${e.message}`;
    errorBox.style.display = 'block';
  }
}

// ─── Render Results ───────────────────────────────────────────────────────────
function renderResults(data) {
  document.getElementById('loading').style.display = 'none';

  const catLabels = { movies: 'Films', books: 'Books', travel: 'Destinations' };
  document.getElementById('res-count').textContent =
    `${data.count} ${catLabels[data.category]} Matched`;

  const prefStr = Object.values(data.preferences).join(' · ');
  document.getElementById('res-sub').textContent = `Based on: ${prefStr}`;

  const grid = document.getElementById('rec-grid');
  grid.innerHTML = '';

  data.recommendations.forEach((item, i) => {
    const card    = document.createElement('div');
    card.className = 'rec-card';
    card.style.animationDelay = `${i * 0.07}s`;

    const matchPct = Math.min(Math.round(item.match_percent), 99);

    card.innerHTML = buildCardHTML(data.category, item, i, matchPct);
    grid.appendChild(card);
  });

  showSection('s3');
  updateSteps(3);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Card HTML Builders ───────────────────────────────────────────────────────
function buildCardHTML(category, item, index, matchPct) {
  const rank = `<div class="rec-rank">${String(index + 1).padStart(2, '0')}</div>`;
  const scoreBar = `
    <div class="score-section">
      <div class="score-bar-bg">
        <div class="score-bar-fill" style="width:${matchPct}%"></div>
      </div>
      <span class="score-pct">${matchPct}%</span>
    </div>`;

  if (category === 'movies') {
    return `
      <div class="rec-body">
        <div class="rec-title">${item.title}</div>
        <div class="rec-meta">
          <span class="rec-meta-item">${item.director}</span>
          <span class="rec-meta-dot"></span>
          <span class="rec-meta-item">${item.year}</span>
          <span class="rec-meta-dot"></span>
          <span class="rec-meta-item">⭐ ${item.rating}</span>
          <span class="rec-meta-dot"></span>
          <span class="rec-meta-item">${item.genre}</span>
        </div>
        <div class="rec-desc">${item.description}</div>
        <div class="rec-tags">${item.tags.map(t => `<span class="rec-tag">${t}</span>`).join('')}</div>
        <div class="detail-row">
          <div class="detail-chip"><span class="icon">🕐</span>${item.duration}</div>
          <div class="detail-chip"><span class="icon">🌍</span>${item.language}</div>
          <div class="detail-chip"><span class="icon">🎭</span>${item.mood}</div>
        </div>
        ${scoreBar}
      </div>
      ${rank}`;
  }

  if (category === 'books') {
    return `
      <div class="rec-body">
        <div class="rec-title">${item.title}</div>
        <div class="rec-meta">
          <span class="rec-meta-item">${item.author}</span>
          <span class="rec-meta-dot"></span>
          <span class="rec-meta-item">${item.year}</span>
          <span class="rec-meta-dot"></span>
          <span class="rec-meta-item">${item.pages} pages</span>
          <span class="rec-meta-dot"></span>
          <span class="rec-meta-item">${item.genre}</span>
        </div>
        <div class="rec-desc">${item.description}</div>
        <div class="rec-tags">${item.tags.map(t => `<span class="rec-tag">${t}</span>`).join('')}</div>
        <div class="detail-row">
          <div class="detail-chip"><span class="icon">📖</span>${item.length} read</div>
          <div class="detail-chip"><span class="icon">⚡</span>${item.pace} pace</div>
          <div class="detail-chip"><span class="icon">🎭</span>${item.mood}</div>
        </div>
        ${scoreBar}
      </div>
      ${rank}`;
  }

  // travel
  return `
    <div class="rec-body">
      <div class="rec-title">${item.destination}</div>
      <div class="rec-meta">
        <span class="rec-meta-item">${item.type}</span>
        <span class="rec-meta-dot"></span>
        <span class="rec-meta-item">${item.climate} climate</span>
        <span class="rec-meta-dot"></span>
        <span class="rec-meta-item">${item.cuisine} cuisine</span>
      </div>
      <div class="rec-desc">${item.description}</div>
      <div class="highlights-list">
        ${item.highlights.map(h => `<span class="highlight-item">📍 ${h}</span>`).join('')}
      </div>
      <div class="rec-tags" style="margin-top:10px">
        ${item.tags.map(t => `<span class="rec-tag">${t}</span>`).join('')}
      </div>
      <div class="detail-row" style="margin-top:8px">
        <div class="detail-chip"><span class="icon">💰</span>${item.budget} budget</div>
        <div class="detail-chip"><span class="icon">📅</span>${item.duration}</div>
        <div class="detail-chip"><span class="icon">🛂</span>visa: ${item.visa_ease}</div>
      </div>
      <div style="margin-top:12px">${scoreBar}</div>
    </div>
    ${rank}`;
}

// ─── Start Over ───────────────────────────────────────────────────────────────
function startOver() {
  selectedCategory = null;
  selections       = {};
  document.querySelectorAll('.cat-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('btn-to-prefs').disabled = true;
  showSection('s1');
  updateSteps(1);
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('visible'));
  if (id) document.getElementById(id).classList.add('visible');
}

function updateSteps(active) {
  for (let i = 1; i <= 3; i++) {
    const step = document.getElementById(`step${i}`);
    step.classList.remove('active', 'done');
    if (i < active)      step.classList.add('done');
    else if (i === active) step.classList.add('active');
    if (i < 3) {
      const line = document.getElementById(`line${i}`);
      line.classList.toggle('done', i < active);
    }
  }
}
