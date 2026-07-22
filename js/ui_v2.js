/* =============================================
   ui.js — UI Utilities, Toasts, Modals, Theme
   ============================================= */

'use strict';

// ── Theme ─────────────────────────────────────
function toggleTheme() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('lf_theme', newTheme);
  document.getElementById('theme-toggle').textContent = newTheme === 'dark' ? '🌙' : '☀️';
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) toggle.checked = newTheme === 'dark';
}

function initTheme() {
  const saved = localStorage.getItem('lf_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';
  const toggle = document.getElementById('dark-mode-toggle');
  if (toggle) toggle.checked = saved === 'dark';
}

// ── Toast Notifications ───────────────────────
function showToast(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toast-container');

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Modals ────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => {
      m.classList.remove('open');
      document.body.style.overflow = '';
    });
  }
});

// ── Sidebar ───────────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    sidebar.classList.toggle('mobile-open');
    document.getElementById('sidebar-overlay').classList.toggle('visible', sidebar.classList.contains('mobile-open'));
  } else {
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('lf_sidebar_collapsed', sidebar.classList.contains('collapsed'));
  }
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-overlay').classList.remove('visible');
}

function initSidebar() {
  const collapsed = localStorage.getItem('lf_sidebar_collapsed') === 'true';
  if (collapsed && window.innerWidth > 768) {
    document.getElementById('sidebar').classList.add('collapsed');
  }
}

// ── Page Navigation ───────────────────────────
const pageTitles = {
  dashboard:  { title: 'Dashboard',       subtitle: 'Your lead generation overview' },
  generate:   { title: 'Generate Leads',  subtitle: 'Configure and run Apify scrape' },
  leads:      { title: 'My Leads (CRM)',  subtitle: 'Browse, filter and manage all leads' },
  history:    { title: 'Scrape History',  subtitle: 'Previous Apify runs and results' },
  analytics:  { title: 'Analytics',       subtitle: 'Lead statistics and performance metrics' },
  settings:   { title: 'Settings',        subtitle: 'Account, API key, and preferences' },
};

function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show selected page
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Highlight nav
  const navItem = document.getElementById(`nav-${pageId}`);
  if (navItem) navItem.classList.add('active');

  // Update header
  const meta = pageTitles[pageId] || { title: pageId, subtitle: '' };
  document.getElementById('page-title').textContent = meta.title;
  document.getElementById('page-subtitle').textContent = meta.subtitle;

  // Close mobile sidebar
  closeMobileSidebar();

  // Page-specific init
  if (pageId === 'leads') { loadCampaignDropdown().then(() => filterLeads()); }
  if (pageId === 'history') renderHistory();
  if (pageId === 'analytics') renderAnalytics();
  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'settings') loadSettingsPage();
  if (pageId === 'generate') { updateQueryPreview(); selectRegion(activeRegion || 'nagpur'); }
}

// ── Wizard Navigation ─────────────────────────
let currentWizardStep = 1;
const TOTAL_STEPS = 6;

function wizardNext(step) {
  if (step === 1 && step < TOTAL_STEPS) {
    // Save API key from wizard if it exists
    const apifyInput = document.getElementById('apify-key-input');
    if (apifyInput) {
      const key = apifyInput.value.trim();
      if (key) {
        localStorage.setItem('lf_apify_key', btoa(key));
        const settingsInput = document.getElementById('settings-apify-key');
        if (settingsInput) settingsInput.value = key;
      }
    }
  }
  goToWizardStep(step + 1);
}

function wizardPrev(step) {
  goToWizardStep(step - 1);
}

function goToWizardStep(step) {
  // Hide current panel
  document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`wp-${step}`).classList.add('active');

  // Update step indicators
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const stepEl = document.getElementById(`ws-${i}`);
    stepEl.classList.remove('active', 'done');
    if (i < step) stepEl.classList.add('done'), (stepEl.querySelector('.step-circle').textContent = '✓');
    else if (i === step) { stepEl.classList.add('active'); stepEl.querySelector('.step-circle').textContent = i; }
    else stepEl.querySelector('.step-circle').textContent = i;
  }

  // Update connectors
  for (let i = 1; i <= TOTAL_STEPS - 1; i++) {
    const conn = document.getElementById(`sc-${i}`);
    if (conn) conn.classList.toggle('done', i < step);
  }

  currentWizardStep = step;
  if (step === 6) updateQueryPreview();
}

function resetWizard() {
  goToWizardStep(1);
  document.getElementById('generate-idle').style.display = 'block';
  document.getElementById('generate-running').style.display = 'none';
  document.getElementById('generate-done').style.display = 'none';
  document.getElementById('generate-back-btn').style.display = 'flex';
}

// ── Chip Toggles ─────────────────────────────
function toggleChip(el) {
  el.classList.toggle('selected');
}

function getSelectedChips(containerId) {
  return Array.from(document.querySelectorAll(`#${containerId} .chip.selected`))
    .map(c => c.getAttribute('data-val'));
}

// ── Tag Input ─────────────────────────────────
const locationTags = [];

function focusTagInput() {
  document.getElementById('location-tag-input').focus();
}

function handleTagInput(e, storeId) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const input = e.target;
    const val = input.value.trim().replace(/,$/, '');
    if (val) addTag(val);
    input.value = '';
  } else if (e.key === 'Backspace' && e.target.value === '' && locationTags.length > 0) {
    removeTag(locationTags[locationTags.length - 1]);
  }
}

function addTag(val) {
  if (!locationTags.includes(val)) {
    locationTags.push(val);
    renderTags();
    updateQueryPreview();
  }
}

function removeTag(val) {
  const idx = locationTags.indexOf(val);
  if (idx !== -1) {
    locationTags.splice(idx, 1);
    renderTags();
    updateQueryPreview();
  }
}

function renderTags() {
  const wrap = document.getElementById('location-tags-wrap');
  const input = document.getElementById('location-tag-input');

  // Remove old tags (keep input)
  wrap.querySelectorAll('.tag').forEach(t => t.remove());

  // Add new tags before input
  locationTags.forEach(tag => {
    const tagEl = document.createElement('span');
    tagEl.className = 'tag';
    tagEl.innerHTML = `${tag} <span class="tag-remove" onclick="removeTag('${tag}')">✕</span>`;
    wrap.insertBefore(tagEl, input);
  });
}

function quickAddLocation(city) {
  addTag(city);
  showToast(`${city} added to locations`, 'info', 1500);
}

// ── Region → City Data (Maharashtra & Goa) ────
const MH_REGIONS = {
  nagpur: {
    label: 'Nagpur Region',
    cities: ['Nagpur', 'Wardha', 'Chandrapur', 'Bhandara', 'Gondia', 'Gadchiroli', 'Amravati', 'Akola', 'Yavatmal', 'Washim']
  },
  nashik: {
    label: 'Nashik Region',
    cities: ['Nashik', 'Ahmednagar', 'Dhule', 'Jalgaon', 'Nandurbar', 'Malegaon']
  },
  pune: {
    label: 'Pune Region',
    cities: ['Pune', 'Pimpri Chinchwad', 'Chakan', 'Talegaon', 'Hinjawadi', 'Baramati', 'Satara', 'Sangli', 'Solapur']
  },
  csn: {
    label: 'Chh. Sambhajinagar Region',
    cities: ['Chhatrapati Sambhajinagar', 'Jalna', 'Beed', 'Latur', 'Osmanabad', 'Nanded', 'Parbhani', 'Hingoli']
  },
  kolhapur: {
    label: 'Kolhapur & Goa Region',
    cities: ['Kolhapur', 'Ratnagiri', 'Sindhudurg', 'Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda']
  },
  mumbai: {
    label: 'Mumbai Region',
    cities: ['Mumbai', 'Navi Mumbai', 'Thane', 'Kalyan', 'Dombivli', 'Vasai', 'Virar', 'Palghar', 'Bhiwandi', 'Mira Bhayandar']
  }
};

let activeRegion = 'nagpur';

function selectRegion(regionKey) {
  activeRegion = regionKey;

  // Update region tab chips
  document.querySelectorAll('#region-tabs .chip').forEach(c => {
    c.classList.toggle('selected', c.getAttribute('data-region') === regionKey);
  });

  // Update city picker label
  const region = MH_REGIONS[regionKey];
  document.getElementById('city-picker-label').textContent = `Cities in ${region.label}`;

  // Render city chips
  const cityChips = document.getElementById('city-chips');
  cityChips.innerHTML = region.cities.map(city => `
    <div class="chip${locationTags.includes(city) ? ' selected' : ''}"
         onclick="toggleCityChip(this, '${city}')">${city}</div>
  `).join('');
}

function toggleCityChip(el, city) {
  if (locationTags.includes(city)) {
    removeTag(city);
    el.classList.remove('selected');
  } else {
    addTag(city);
    el.classList.add('selected');
  }
  updateLocationCount();
}

function addAllRegionCities() {
  const region = MH_REGIONS[activeRegion];
  region.cities.forEach(city => {
    if (!locationTags.includes(city)) addTag(city);
  });
  selectRegion(activeRegion); // refresh chip states
  updateLocationCount();
  showToast(`All ${region.label} cities added`, 'success', 2000);
}

function clearRegionCities() {
  const region = MH_REGIONS[activeRegion];
  region.cities.forEach(city => removeTag(city));
  selectRegion(activeRegion);
  updateLocationCount();
  showToast(`${region.label} cities removed`, 'info', 1500);
}

function updateLocationCount() {
  const el = document.getElementById('location-count');
  if (el) el.textContent = `${locationTags.length} ${locationTags.length === 1 ? 'city' : 'cities'}`;
}

// Patch addTag/removeTag to also update count badge
const _origAddTag = addTag;
const _origRemoveTag = removeTag;


// ── Query Preview Builder ─────────────────────
function updateQueryPreview() {
  const industries = getSelectedChips('industries-chips');
  const products   = getSelectedChips('products-chips');
  const locations  = locationTags.length > 0 ? locationTags : ['[Your Location]'];

  const queries = [];
  industries.slice(0, 3).forEach(ind => {
    locations.slice(0, 4).forEach(loc => {
      queries.push(`"${ind}" in ${loc}`);
    });
  });

  products.slice(0, 2).forEach(prod => {
    locations.slice(0, 2).forEach(loc => {
      queries.push(`"${prod} dealer" in ${loc}`);
    });
  });

  const preview = document.getElementById('query-preview');
  if (preview) {
    preview.innerHTML = queries.length
      ? queries.map(q => `<span style="display:inline-block;background:var(--accent-glow);border:1px solid var(--border-focus);border-radius:4px;padding:2px 8px;margin:3px;color:var(--accent);">${q}</span>`).join('')
      : '<span style="color:var(--text-muted)">No queries — select industries and add locations first.</span>';
  }

  // Summary grid
  const grid = document.getElementById('summary-grid');
  if (grid) {
    grid.innerHTML = [
      { label: '🏭 Industries', value: industries.length ? industries.join(', ') : 'None selected' },
      { label: '📦 Products', value: products.length ? products.join(', ') : 'None selected' },
      { label: '📍 Locations', value: locations.join(', ') },
      { label: '🔢 Max Results', value: `${document.getElementById('max-results')?.value || 50} per query` },
      { label: '⭐ Min Rating', value: `${document.getElementById('min-rating')?.value || 3.5} stars` },
      { label: '📊 Total Queries', value: `${queries.length} searches` },
    ].map(item => `
      <div style="background:var(--bg-input);border-radius:var(--radius-md);padding:12px">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${item.label}</div>
        <div style="font-size:13px;color:var(--text-primary);font-weight:500">${item.value}</div>
      </div>
    `).join('');
  }

  // Hide demo mode if API key is present
  const hasApiKey = !!(localStorage.getItem('lf_apify_key') || document.getElementById('apify-key-input')?.value.trim());
  const demoBtn = document.getElementById('demo-mode-btn');
  const demoTip = document.getElementById('demo-mode-tip');
  if (demoBtn) demoBtn.style.display = hasApiKey ? 'none' : 'block';
  if (demoTip) demoTip.style.display = hasApiKey ? 'none' : 'flex';
}

// ── Settings Page ─────────────────────────────
function loadSettingsPage() {
  const user = getCurrentUser();
  if (!user) return;

  const apiKey = localStorage.getItem('lf_apify_key');
  if (apiKey) {
    try { document.getElementById('settings-apify-key').value = atob(apiKey); } catch(e) {}
  }

  // Load saved actor ID
  const actorId = localStorage.getItem('lf_actor_id');
  const actorEl = document.getElementById('settings-actor-id');
  if (actorEl) actorEl.value = actorId || '';

  document.getElementById('settings-name').value    = user.name || '';
  document.getElementById('settings-email').value   = user.email || '';
  document.getElementById('settings-company').value = user.company || '';

  const plan = user.plan || 'free';
  const leads = getLeads();
  const maxLeads = plan === 'free' ? 50 : '∞';

  document.getElementById('settings-plan-name').textContent  = plan.charAt(0).toUpperCase() + plan.slice(1);
  document.getElementById('settings-leads-used').textContent = `${leads.length} / ${maxLeads}`;
  document.getElementById('settings-runs').textContent       = user.runsCount || 0;

  if (plan === 'free') {
    const pct = Math.min((leads.length / 50) * 100, 100);
    document.getElementById('plan-usage-bar').style.width = pct + '%';
  } else {
    document.getElementById('plan-usage-bar').style.width = '100%';
    document.getElementById('plan-usage-bar').style.background = 'var(--gradient-accent)';
  }
}

function saveApiKey() {
  const key     = document.getElementById('settings-apify-key').value.trim();
  const actorId = document.getElementById('settings-actor-id')?.value.trim();

  // Save API key
  if (key) {
    localStorage.setItem('lf_apify_key', btoa(key));
    const wizardInp = document.getElementById('apify-key-input');
    if (wizardInp) wizardInp.value = key;
  } else {
    localStorage.removeItem('lf_apify_key');
  }

  // Save custom actor ID (or clear if blank → auto-detect)
  if (actorId) {
    localStorage.setItem('lf_actor_id', actorId);
    showToast('API key & Actor ID saved ✓', 'success');
  } else {
    localStorage.removeItem('lf_actor_id'); // will auto-detect on next run
    showToast(key ? 'API key saved. Actor ID will be auto-detected ✓' : 'API key cleared', key ? 'success' : 'info');
  }
}

async function testApifyConnection() {
  const key = document.getElementById('settings-apify-key').value.trim() || (getApifyKey ? getApifyKey() : null);
  if (!key) { showToast('Enter an API key first.', 'warning'); return; }

  const btn = document.querySelector('[onclick="testApifyConnection()"]');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Testing...'; }

  try {
    // Test key validity by fetching user info
    const resp = await fetch('https://api.apify.com/v2/users/me', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    const data = await resp.json();

    if (resp.ok && data?.data?.username) {
      showToast(`✅ Connected as @${data.data.username} (${data.data.plan?.tierName || 'Free'} plan)`, 'success', 5000);
      // Clear cached actor ID so it re-resolves with this key
      localStorage.removeItem('lf_actor_id');
    } else {
      showToast('❌ Invalid API key. Check and try again.', 'error', 5000);
    }
  } catch(e) {
    showToast('⚠️ Connection failed. Check your internet or API key.', 'error', 5000);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '🔌 Test Connection'; }
  }
}

function saveProfile() {
  const name    = document.getElementById('settings-name').value.trim();
  const email   = document.getElementById('settings-email').value.trim();
  const company = document.getElementById('settings-company').value.trim();

  updateCurrentUser({ name, email, company });
  updateSidebarUser();
  showToast('Profile saved ✓', 'success');
}

// ── Sidebar User Info ─────────────────────────
function updateSidebarUser() {
  const user = getCurrentUser();
  if (!user) return;
  const nameEl  = document.getElementById('user-name-sidebar');
  const planEl  = document.getElementById('user-plan-sidebar');
  const avatarEl = document.getElementById('user-avatar-sidebar');

  if (nameEl) nameEl.textContent = user.name || user.email || 'User';
  if (planEl) planEl.textContent = (user.plan || 'free').charAt(0).toUpperCase() + (user.plan || 'free').slice(1) + ' Plan';
  if (avatarEl) avatarEl.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
}

// ── Confirm Clear ─────────────────────────────
function confirmClearLeads() {
  const leads = getLeads();
  document.getElementById('clear-count').textContent = leads.length;
  openModal('modal-confirm-clear');
}

function clearAllLeads() {
  clearLeads();
  closeModal('modal-confirm-clear');
  showToast('All leads cleared.', 'info');
  renderLeadsTable();
  renderDashboard();
  updateLeadsBadge();
}

// ── Lead Badge ────────────────────────────────
// ── Lead Badge ────────────────────────────────
async function updateLeadsBadge() {
  const badge = document.getElementById('leads-count-badge');
  if (badge) {
    try {
      const apiBase = window.getApiBaseUrl ? window.getApiBaseUrl() : 'http://localhost:3000';
      const res = await fetch(`${apiBase}/api/leads?page=1&limit=1`);
      if (res.ok) {
        const { meta } = await res.json();
        badge.textContent = meta.total || 0;
      }
    } catch(err) {
      console.error(err);
    }
  }
}

// ── Render History ─────────────────────────────
function renderHistory() {
  const history = JSON.parse(localStorage.getItem('lf_history') || '[]').reverse();
  const container = document.getElementById('history-list');

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🕐</div>
        <div class="empty-title">No scrape history</div>
        <div class="empty-desc">Your Apify scrape runs will appear here.</div>
      </div>`;
    return;
  }

  container.innerHTML = history.map(h => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px;border-bottom:1px solid var(--border);flex-wrap:wrap;gap:10px">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--accent-glow);display:flex;align-items:center;justify-content:center;font-size:20px">🔍</div>
        <div>
          <div style="font-weight:600;font-size:14px;color:var(--text-primary)">${h.query || 'Multi-query run'}</div>
          <div style="font-size:12px;color:var(--text-secondary)">${new Date(h.timestamp).toLocaleString()} · ${h.duration || '—'}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:22px;font-weight:800;color:var(--accent)">${h.leadsFound}</span>
        <span style="font-size:12px;color:var(--text-secondary)">leads found</span>
        <span class="status-badge ${h.status === 'completed' ? 'status-won' : 'status-new'}">${h.status}</span>
      </div>
    </div>
  `).join('');
}

function clearHistory() {
  if (confirm('Clear all scrape history?')) {
    localStorage.removeItem('lf_history');
    renderHistory();
    showToast('History cleared.', 'info');
  }
}

// ── Render Analytics ──────────────────────────
function renderAnalytics() {
  const leads = getLeads();

  document.getElementById('ana-total').textContent   = leads.length;
  document.getElementById('ana-won').textContent     = leads.filter(l => l.status === 'won').length;
  document.getElementById('ana-dupes').textContent   = localStorage.getItem('lf_dupes_skipped') || 0;

  const rated = leads.filter(l => l.rating > 0);
  const avg = rated.length ? (rated.reduce((s, l) => s + l.rating, 0) / rated.length).toFixed(1) : '—';
  document.getElementById('ana-rating').textContent = avg;

  // Status breakdown
  const statuses = ['new','contacted','qualified','proposal','won','lost'];
  const statusColors = { new:'var(--accent)', contacted:'var(--orange)', qualified:'var(--purple)', proposal:'var(--cyan)', won:'var(--green)', lost:'var(--red)' };
  const statusCounts = {};
  statuses.forEach(s => statusCounts[s] = leads.filter(l => l.status === s).length);

  document.getElementById('status-breakdown').innerHTML = statuses.map(s => {
    const count = statusCounts[s];
    const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
    return `
      <div style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text-secondary);text-transform:capitalize">${s}</span>
          <span style="font-weight:600">${count} <span style="color:var(--text-muted);font-weight:400">(${pct}%)</span></span>
        </div>
        <div style="height:6px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${statusColors[s]};border-radius:var(--radius-full);transition:width 0.5s ease"></div>
        </div>
      </div>`;
  }).join('');

  // Location breakdown
  const locMap = {};
  leads.forEach(l => { const loc = l.location || 'Unknown'; locMap[loc] = (locMap[loc] || 0) + 1; });
  const topLocs = Object.entries(locMap).sort((a,b) => b[1]-a[1]).slice(0,8);
  const maxLoc = topLocs[0]?.[1] || 1;

  document.getElementById('location-breakdown').innerHTML = topLocs.length
    ? topLocs.map(([loc, count]) => {
        const pct = Math.round((count / maxLoc) * 100);
        return `
          <div style="margin-bottom:12px">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
              <span style="color:var(--text-secondary)">📍 ${loc}</span>
              <span style="font-weight:600">${count}</span>
            </div>
            <div style="height:6px;background:var(--bg-input);border-radius:var(--radius-full);overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--gradient-accent);border-radius:var(--radius-full);transition:width 0.5s ease"></div>
            </div>
          </div>`;
      }).join('')
    : '<div class="empty-state" style="padding:24px"><div class="empty-desc">No location data yet.</div></div>';
}

// ── Dashboard Render ──────────────────────────
async function renderDashboard() {
  const user  = getCurrentUser();
  const runs  = user?.runsCount || 0;

  const demoBanner = document.getElementById('demo-banner');
  if (demoBanner) demoBanner.style.display = 'none';

  try {
    const apiBase = window.getApiBaseUrl ? window.getApiBaseUrl() : 'http://localhost:3000';
    // Fetch stats and recent 5 leads from the backend
    const res = await fetch(`${apiBase}/api/leads?page=1&limit=5`);
    if (!res.ok) throw new Error('Failed to fetch dashboard data');
    const { data: recent, meta } = await res.json();

    document.getElementById('stat-total').textContent = meta.total || 0;
    document.getElementById('stat-qualified').textContent = 0; // We will update this later with real backend stats
    document.getElementById('stat-runs').textContent = runs;
    document.getElementById('stat-rating').textContent = '—'; // Real rating average requires backend support

    const tbody = document.getElementById('recent-leads-body');

    if (!recent.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="padding:32px 20px"><div class="empty-icon">🔍</div><div class="empty-title">No leads yet</div><div class="empty-desc">Generate leads to see them here.</div><button class="btn btn-primary btn-sm" onclick="showPage('generate')">Generate First Leads</button></div></td></tr>`;
      return;
    }

    tbody.innerHTML = recent.map(l => `
      <tr>
        <td>
          <div class="company-cell">
            <div class="company-avatar">${(l.company_name || '?').charAt(0)}</div>
            <div>
              <div class="company-name">${esc(l.company_name)}</div>
              <div class="company-category">${esc(l.category || '')}</div>
            </div>
          </div>
        </td>
        <td class="phone-cell">${esc(l.phone || '—')}</td>
        <td>${esc(l.category || '—')}</td>
        <td>${esc(l.city || '—')}</td>
        <td>${renderRating(l.rating, l.reviews)}</td>
        <td><span class="status-badge status-new">new</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Dashboard fetch error:', err);
  }
}

// ── Helpers ───────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function renderRating(rating, reviews) {
  if (!rating) return '<span style="color:var(--text-muted)">—</span>';
  const stars = '★'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '½' : '');
  return `<div class="rating"><span class="rating-stars">${stars}</span><span class="rating-value">${rating}</span>${reviews ? `<span class="rating-count">(${reviews})</span>` : ''}</div>`;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
