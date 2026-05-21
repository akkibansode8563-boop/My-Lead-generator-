/* =============================================
   leads.js — Lead Data Layer & CRM Table
   ============================================= */

'use strict';

const LEADS_KEY = 'lf_leads';

// ── CRUD ──────────────────────────────────────
function getLeads() {
  try { return JSON.parse(localStorage.getItem(LEADS_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveBulkLeads(leadsArr) {
  const existing = getLeads();
  existing.push(...leadsArr);
  localStorage.setItem(LEADS_KEY, JSON.stringify(existing));
}

function saveLead(lead) {
  const leads = getLeads();
  leads.push(lead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function updateLead(id, updates) {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx !== -1) {
    leads[idx] = { ...leads[idx], ...updates };
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    return leads[idx];
  }
  return null;
}

function deleteLead(id) {
  const leads = getLeads().filter(l => l.id !== id);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function clearLeads() {
  localStorage.removeItem(LEADS_KEY);
}

// ── Duplicate Detection ───────────────────────
function isDuplicate(newLead, existingLeads) {
  const normPhone = p => (p || '').replace(/\D/g, '');
  const normName  = n => (n || '').toLowerCase().trim();

  return existingLeads.some(l => {
    // Match by phone
    const phoneMatch = normPhone(l.phone) && normPhone(newLead.phone) &&
                       normPhone(l.phone) === normPhone(newLead.phone);
    // Match by name + location
    const nameLocMatch = normName(l.name) === normName(newLead.name) &&
                         (l.location || '').toLowerCase() === (newLead.location || '').toLowerCase();

    return phoneMatch || nameLocMatch;
  });
}

// ── Import with dedup ─────────────────────────
function importLeads(rawLeads, options = {}) {
  const {
    skipDuplicates = true,
    requirePhone   = false,
    requireWebsite = false,
    minRating      = 0,
    minReviews     = 0,
    defaultStatus  = 'new',
    includeKw      = [],
    excludeKw      = [],
    excludeClosed  = true,
  } = options;

  const existing = getLeads();
  let imported = 0, dupes = 0, filtered = 0;
  const toAdd = [];

  rawLeads.forEach(raw => {
    const lead = normalizeApifyLead(raw, defaultStatus);

    // Filters
    if (excludeClosed && raw.permanentlyClosed) { filtered++; return; }
    if (requirePhone && !lead.phone) { filtered++; return; }
    if (requireWebsite && !lead.website) { filtered++; return; }
    if (lead.rating < minRating) { filtered++; return; }
    if (lead.reviews < minReviews) { filtered++; return; }

    // Keyword filters
    const haystack = `${lead.name} ${lead.category} ${lead.address}`.toLowerCase();
    if (includeKw.length && !includeKw.some(kw => haystack.includes(kw.toLowerCase()))) { filtered++; return; }
    if (excludeKw.some(kw => kw && haystack.includes(kw.toLowerCase()))) { filtered++; return; }

    // Duplicate check
    if (skipDuplicates && (isDuplicate(lead, existing) || isDuplicate(lead, toAdd))) { dupes++; return; }

    toAdd.push(lead);
    imported++;
  });

  if (toAdd.length) saveBulkLeads(toAdd);

  // Track dupes
  const prevDupes = parseInt(localStorage.getItem('lf_dupes_skipped') || '0');
  localStorage.setItem('lf_dupes_skipped', prevDupes + dupes);

  return { imported, dupes, filtered };
}

// ── Normalize Apify Google Maps result ────────
function normalizeApifyLead(raw, defaultStatus = 'new') {
  return {
    id:        generateId(),
    name:      raw.title || raw.name || raw.placeName || 'Unknown',
    phone:     raw.phone || raw.phoneUnformatted || '',
    email:     raw.email || '',
    website:   raw.website || raw.url || '',
    address:   raw.address || raw.street || raw.fullAddress || '',
    rating:    parseFloat(raw.totalScore || raw.rating || 0) || 0,
    reviews:   parseInt(raw.reviewsCount || raw.reviewCount || raw.reviews || 0) || 0,
    category:  raw.categoryName || raw.category || raw.categories?.[0] || '',
    location:  raw.city || raw.state || extractCity(raw.address) || '',
    lat:       raw.location?.lat || raw.lat || null,
    lng:       raw.location?.lng || raw.lng || null,
    plusCode:  raw.plusCode || '',
    status:    defaultStatus,
    notes:     '',
    industry:  raw._industry || '',
    source:    'apify',
    runId:     raw._runId || '',
    createdAt: new Date().toISOString(),
  };
}

function extractCity(address) {
  if (!address) return '';
  const parts = address.split(',');
  return parts.length >= 2 ? parts[parts.length - 2].trim() : '';
}

// ── CRM Table State ───────────────────────────
let currentPage = 1;
const PAGE_SIZE = 25;
let filteredLeads = [];
let sortField = 'createdAt';
let sortDir = 'desc';

function filterLeads() {
  const search   = (document.getElementById('leads-search')?.value || '').toLowerCase();
  const region   = document.getElementById('filter-region')?.value || '';
  const city     = document.getElementById('filter-city')?.value || '';
  const status   = document.getElementById('filter-status')?.value || '';
  const category = document.getElementById('filter-category')?.value || '';
  const rating   = parseFloat(document.getElementById('filter-rating')?.value || '0');

  // Build set of allowed cities when a region is selected
  const regionCities = region && typeof MH_REGIONS !== 'undefined'
    ? MH_REGIONS[region]?.cities || []
    : [];

  const all = getLeads();

  filteredLeads = all.filter(l => {
    if (status   && l.status !== status)         return false;
    if (category && l.category !== category)     return false;
    if (rating   && (l.rating || 0) < rating)   return false;
    // City filter (exact)
    if (city && (l.location || '').toLowerCase() !== city.toLowerCase()) return false;
    // Region filter: city must be in region's city list
    if (regionCities.length && !regionCities.some(rc => (l.location || '').toLowerCase().includes(rc.toLowerCase()))) return false;
    if (search) {
      const hay = `${l.name} ${l.phone} ${l.email} ${l.address} ${l.category} ${l.location} ${l.website}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  // Sort
  filteredLeads.sort((a, b) => {
    let av = a[sortField] || '';
    let bv = b[sortField] || '';
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  currentPage = 1;
  renderLeadsTable();
}

function sortLeads(field) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }

  // Update sort icons
  document.querySelectorAll('.leads-table th').forEach(th => th.classList.remove('sorted'));
  const ths = document.querySelectorAll('.leads-table th');
  // mark the clicked th
  filterLeads();
}

function clearFilters() {
  document.getElementById('leads-search').value    = '';
  document.getElementById('filter-region').value   = '';
  document.getElementById('filter-city').value     = '';
  document.getElementById('filter-status').value   = '';
  document.getElementById('filter-category').value = '';
  document.getElementById('filter-rating').value   = '';
  // Reset city dropdown to All Cities
  const citySel = document.getElementById('filter-city');
  if (citySel) citySel.innerHTML = '<option value="">All Cities</option>';
  filterLeads();
}

// Populate city dropdown when region changes
function onRegionFilterChange() {
  const region = document.getElementById('filter-region')?.value || '';
  const citySel = document.getElementById('filter-city');
  if (!citySel) return;

  if (!region || typeof MH_REGIONS === 'undefined') {
    citySel.innerHTML = '<option value="">All Cities</option>';
  } else {
    const cities = MH_REGIONS[region]?.cities || [];
    citySel.innerHTML = '<option value="">All Cities</option>' +
      cities.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  filterLeads();
}

// Populate filter dropdowns
function populateFilterDropdowns() {
  const leads = getLeads();
  const categories = [...new Set(leads.map(l => l.category).filter(Boolean))].sort();

  const catSel = document.getElementById('filter-category');
  if (catSel) {
    const curCat = catSel.value;
    catSel.innerHTML = '<option value="">All Categories</option>' +
      categories.map(c => `<option value="${esc(c)}"${c===curCat?' selected':''}>${esc(c)}</option>`).join('');
  }
}

// ── Render Table ──────────────────────────────
function renderLeadsTable() {
  populateFilterDropdowns();
  if (!filteredLeads.length) filterLeads();

  const tbody = document.getElementById('leads-table-body');
  if (!tbody) return;

  const total = filteredLeads.length;
  const start = (currentPage - 1) * PAGE_SIZE;
  const end   = Math.min(start + PAGE_SIZE, total);
  const page  = filteredLeads.slice(start, end);

  if (!total) {
    tbody.innerHTML = `<tr><td colspan="12"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No leads found</div><div class="empty-desc">Try adjusting your filters or generate new leads.</div><button class="btn btn-primary btn-sm" onclick="showPage('generate')">⚡ Generate Leads</button></div></td></tr>`;
    document.getElementById('pagination-info').textContent = 'No results';
    document.getElementById('pagination-controls').innerHTML = '';
    return;
  }

  tbody.innerHTML = page.map(l => buildLeadRow(l)).join('');

  // Pagination info
  document.getElementById('pagination-info').textContent =
    `Showing ${start + 1}–${end} of ${total} lead${total !== 1 ? 's' : ''}`;

  renderPagination(total);
}

function buildLeadRow(l) {
  const statusOptions = ['new','contacted','qualified','proposal','won','lost'];
  const websiteDisplay = l.website
    ? `<a href="${esc(l.website)}" target="_blank" class="web-link" title="${esc(l.website)}">🌐 Visit</a>`
    : '<span style="color:var(--text-muted)">—</span>';

  const emailDisplay = l.email
    ? `<a href="mailto:${esc(l.email)}" style="color:var(--cyan);font-size:12px">${esc(l.email)}</a>`
    : '<span style="color:var(--text-muted);font-size:12px">—</span>';

  return `
    <tr id="row-${l.id}">
      <td><input type="checkbox" class="lead-checkbox" data-id="${l.id}" /></td>
      <td>
        <div class="company-cell">
          <div class="company-avatar" style="background:${avatarColor(l.name)}">${(l.name||'?').charAt(0).toUpperCase()}</div>
          <div>
            <div class="company-name" title="${esc(l.name)}">${esc(l.name)}</div>
            <div class="company-category">${esc(l.category || '')}</div>
          </div>
        </div>
      </td>
      <td class="phone-cell">${l.phone ? `<a href="tel:${esc(l.phone)}" style="color:var(--cyan);text-decoration:none">${esc(l.phone)}</a>` : '<span style="color:var(--text-muted)">—</span>'}</td>
      <td>${emailDisplay}</td>
      <td>${websiteDisplay}</td>
      <td><div class="address-cell" title="${esc(l.address)}">${esc(l.address) || '—'}</div></td>
      <td>${renderRating(l.rating, l.reviews)}</td>
      <td><span style="font-size:12px;color:var(--text-secondary)">${esc(l.category || '—')}</span></td>
      <td><span style="font-size:12px">📍 ${esc(l.location || '—')}</span></td>
      <td>
        <select class="status-badge status-${l.status||'new'}" onchange="changeLeadStatus('${l.id}', this.value, this)" style="cursor:pointer;padding:4px 10px;border-radius:var(--radius-full);font-size:11px;font-weight:600;border:none;font-family:inherit">
          ${statusOptions.map(s => `<option value="${s}" ${l.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </td>
      <td>
        <div style="max-width:140px;font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(l.notes)}">
          ${l.notes ? esc(l.notes) : '<span style="color:var(--text-muted)">Add note...</span>'}
        </div>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn edit" title="View Details" onclick="openLeadDetail('${l.id}')">👁</button>
          <button class="action-btn edit" title="Edit Notes" onclick="openNoteEdit('${l.id}')">✏️</button>
          <button class="action-btn del"  title="Delete Lead" onclick="confirmDeleteLead('${l.id}')">🗑</button>
        </div>
      </td>
    </tr>`;
}

function avatarColor(name) {
  const colors = [
    'linear-gradient(135deg,#4f8ef7,#00d4ff)',
    'linear-gradient(135deg,#7c6cf7,#f06292)',
    'linear-gradient(135deg,#00e676,#00bcd4)',
    'linear-gradient(135deg,#ffb74d,#ff7043)',
    'linear-gradient(135deg,#26c6da,#7c6cf7)',
    'linear-gradient(135deg,#ef5350,#ffb74d)',
  ];
  const idx = (name || '').charCodeAt(0) % colors.length;
  return colors[idx];
}

// ── Lead Detail Modal ─────────────────────────
function openLeadDetail(id) {
  const lead = getLeads().find(l => l.id === id);
  if (!lead) return;

  document.getElementById('modal-lead-title').textContent = lead.name;
  document.getElementById('modal-lead-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border)">
      <div style="width:56px;height:56px;border-radius:var(--radius-md);background:${avatarColor(lead.name)};display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:white;flex-shrink:0">${(lead.name||'?').charAt(0).toUpperCase()}</div>
      <div>
        <div style="font-size:18px;font-weight:700;color:var(--text-primary)">${esc(lead.name)}</div>
        <div style="font-size:13px;color:var(--text-secondary)">${esc(lead.category || '')} · ${esc(lead.location || '')}</div>
        <span class="status-badge status-${lead.status||'new'}" style="margin-top:6px;display:inline-flex">${lead.status||'new'}</span>
      </div>
      <div style="margin-left:auto">${renderRating(lead.rating, lead.reviews)}</div>
    </div>

    <div>
      ${row('📞 Phone',    lead.phone    ? `<a href="tel:${esc(lead.phone)}" style="color:var(--cyan)">${esc(lead.phone)}</a>` : '—')}
      ${row('📧 Email',    lead.email    ? `<a href="mailto:${esc(lead.email)}" style="color:var(--accent)">${esc(lead.email)}</a>` : '—')}
      ${row('🌐 Website',  lead.website  ? `<a href="${esc(lead.website)}" target="_blank" style="color:var(--accent)">${esc(lead.website)}</a>` : '—')}
      ${row('📍 Address',  lead.address  || '—')}
      ${row('🏙️ Location', lead.location || '—')}
      ${row('🏭 Category', lead.category || '—')}
      ${row('📅 Added',    new Date(lead.createdAt).toLocaleString())}
      ${row('🔗 Source',   lead.source === 'demo' ? 'Demo Data' : `Apify Run ${lead.runId || ''}`)}
    </div>

    <div style="margin-top:16px">
      <label class="form-label">📝 Notes</label>
      <textarea class="note-input" id="detail-note-${id}" placeholder="Add notes about this lead...">${esc(lead.notes || '')}</textarea>
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-primary btn-sm" onclick="saveLeadNote('${id}')">Save Note</button>
        <select class="form-select" style="height:36px;padding:0 28px 0 12px" onchange="changeLeadStatus('${id}',this.value)">
          ${['new','contacted','qualified','proposal','won','lost'].map(s=>`<option ${lead.status===s?'selected':''} value="${s}">${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </div>
    </div>`;

  openModal('modal-lead-detail');
}

function row(label, val) {
  return `<div class="info-row"><div class="info-label">${label}</div><div class="info-value">${val}</div></div>`;
}

function openNoteEdit(id) {
  openLeadDetail(id);
  setTimeout(() => document.getElementById(`detail-note-${id}`)?.focus(), 300);
}

function saveLeadNote(id) {
  const note = document.getElementById(`detail-note-${id}`)?.value || '';
  updateLead(id, { notes: note });
  renderLeadsTable();
  showToast('Note saved ✓', 'success');
  closeModal('modal-lead-detail');
}

function changeLeadStatus(id, status, selectEl) {
  updateLead(id, { status });
  // Update badge class if we have the select element in table
  if (selectEl) {
    selectEl.className = `status-badge status-${status}`;
    selectEl.style.cssText = `cursor:pointer;padding:4px 10px;border-radius:var(--radius-full);font-size:11px;font-weight:600;border:none;font-family:inherit`;
  }
  showToast(`Status updated to "${status}"`, 'success', 1800);
}

function confirmDeleteLead(id) {
  if (confirm('Delete this lead? This cannot be undone.')) {
    deleteLead(id);
    filterLeads();
    renderLeadsTable();
    updateLeadsBadge();
    renderDashboard();
    showToast('Lead deleted.', 'info');
  }
}

// ── Pagination ────────────────────────────────
function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const controls = document.getElementById('pagination-controls');
  if (!controls) return;

  if (totalPages <= 1) { controls.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>‹</button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (totalPages > 7) {
      if (i !== 1 && i !== totalPages && Math.abs(i - currentPage) > 2) {
        if (i === 2 || i === totalPages - 1) html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
        continue;
      }
    }
    html += `<button class="page-btn ${i===currentPage?'active':''}" onclick="goToPage(${i})">${i}</button>`;
  }

  html += `<button class="page-btn" onclick="goToPage(${currentPage+1})" ${currentPage===totalPages?'disabled':''}>›</button>`;
  controls.innerHTML = html;
}

function goToPage(p) {
  const totalPages = Math.ceil(filteredLeads.length / PAGE_SIZE);
  if (p < 1 || p > totalPages) return;
  currentPage = p;
  renderLeadsTable();
  document.getElementById('page-leads')?.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Select All ────────────────────────────────
function toggleSelectAll(checkbox) {
  document.querySelectorAll('.lead-checkbox').forEach(cb => cb.checked = checkbox.checked);
}

function getSelectedLeadIds() {
  return Array.from(document.querySelectorAll('.lead-checkbox:checked')).map(cb => cb.getAttribute('data-id'));
}
