/* =============================================
   export.js — CSV & Excel Export
   ============================================= */

'use strict';

// ── Column definitions ─────────────────────────
const EXPORT_COLUMNS = [
  { key: 'name',      label: 'Company Name' },
  { key: 'phone',     label: 'Contact Number' },
  { key: 'email',     label: 'Email' },
  { key: 'website',   label: 'Website' },
  { key: 'address',   label: 'Address' },
  { key: 'rating',    label: 'Google Rating' },
  { key: 'reviews',   label: 'Review Count' },
  { key: 'category',  label: 'Business Category' },
  { key: 'location',  label: 'Location' },
  { key: 'industry',  label: 'Industry Segment' },
  { key: 'status',    label: 'Lead Status' },
  { key: 'notes',     label: 'Notes' },
  { key: 'source',    label: 'Source' },
  { key: 'createdAt', label: 'Date Added' },
];

// ── Get export data ───────────────────────────
function getExportRows() {
  const leads = filteredLeads.length > 0 ? filteredLeads : getLeads();
  return leads.map(lead => {
    const row = {};
    EXPORT_COLUMNS.forEach(col => {
      let val = lead[col.key] || '';
      if (col.key === 'createdAt' && val) {
        val = new Date(val).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'2-digit' });
      }
      if (col.key === 'rating' && val) val = parseFloat(val).toFixed(1);
      row[col.label] = val;
    });
    return row;
  });
}

// ── CSV Export ─────────────────────────────────
function exportLeadsCSV() {
  const leads = filteredLeads.length > 0 ? filteredLeads : getLeads();
  if (!leads.length) { showToast('No leads to export.', 'warning'); return; }

  const headers = EXPORT_COLUMNS.map(c => c.label);
  const rows = leads.map(lead =>
    EXPORT_COLUMNS.map(col => {
      let val = lead[col.key] || '';
      if (col.key === 'createdAt' && val) val = new Date(val).toLocaleDateString('en-IN');
      if (col.key === 'rating' && val) val = parseFloat(val).toFixed(1);
      // Escape CSV values
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    })
  );

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  downloadBlob(blob, `My_Lead_Generator_Leads_${dateStamp()}.csv`);
  showToast(`✅ Exported ${leads.length} leads as CSV`, 'success');
}

// Global variables to store the last generated file for "Download Again"
let lastExportedBlob = null;
let lastExportedFilename = null;

// Helper to get active CRM filters
function getActiveFilterParams() {
  const params = new URLSearchParams();
  const search      = document.getElementById('leads-search')?.value || '';
  const region      = document.getElementById('filter-region')?.value || '';
  const city        = document.getElementById('filter-city')?.value || '';
  const category    = document.getElementById('filter-category')?.value || '';
  const industry    = document.getElementById('filter-industry')?.value || '';
  const sector      = document.getElementById('filter-sector')?.value || '';
  const platform    = document.getElementById('filter-platform')?.value || '';
  const status      = document.getElementById('filter-status')?.value || '';
  const campaign_id = document.getElementById('filter-campaign')?.value || '';

  if (campaign_id) params.append('campaign_id', campaign_id);
  if (city) params.append('city', city);
  else if (region && region !== 'all') params.append('region', region);
  if (industry)  params.append('industry', industry);
  if (category)  params.append('category', category);
  if (search)    params.append('search', search);
  if (sector)    params.append('sector', sector);
  if (platform)  params.append('source', platform);
  if (status)    params.append('status', status);

  return params;
}

// Validation helpers
function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validatePhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\D/g, '');
  return cleaned.length >= 8 && cleaned.length <= 15;
}

// ── Excel Export (SheetJS) ────────────────────
async function exportLeadsExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded. Check your internet connection.', 'error');
    return;
  }

  const startTime = Date.now();
  
  // Show progress modal
  openModal('modal-export-progress');
  
  const progressBar = document.getElementById('export-progress-bar');
  const progressPct = document.getElementById('export-progress-pct');
  const progressLabel = document.getElementById('export-progress-label');
  const progressStatus = document.getElementById('export-progress-status');

  const updateProgress = (page, total, text = '') => {
    const pct = total > 0 ? Math.round((page / total) * 100) : 0;
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressPct) progressPct.textContent = pct + '%';
    if (progressLabel) progressLabel.textContent = `Pages: ${page} / ${total}`;
    if (progressStatus) progressStatus.textContent = text || `Fetching page ${page} of ${total}...`;
  };

  updateProgress(0, 0, 'Connecting to server...');

  let allLeads = [];
  let page = 1;
  let totalPages = 1;
  const limit = 100;
  
  try {
    const filterParams = getActiveFilterParams();

    // Fetch first page to get metadata and totalPages
    const params = new URLSearchParams(filterParams);
    params.set('page', page);
    params.set('limit', limit);

    const apiBase = window.getApiBaseUrl ? window.getApiBaseUrl() : 'http://localhost:3000';
    const firstRes = await fetch(`${apiBase}/api/leads?${params.toString()}`);
    if (!firstRes.ok) throw new Error('Failed to fetch leads page 1');
    const firstData = await firstRes.json();
    
    allLeads.push(...(firstData.data || []));
    totalPages = firstData.meta?.totalPages || 1;
    
    updateProgress(1, totalPages, `Fetched page 1 of ${totalPages}`);

    // Fetch remaining pages sequentially
    for (page = 2; page <= totalPages; page++) {
      updateProgress(page, totalPages, `Fetching page ${page} of ${totalPages}...`);
      
      const pageParams = new URLSearchParams(filterParams);
      pageParams.set('page', page);
      pageParams.set('limit', limit);

      const res = await fetch(`${apiBase}/api/leads?${pageParams.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch leads page ${page}`);
      const pageData = await res.json();
      
      allLeads.push(...(pageData.data || []));
      
      updateProgress(page, totalPages, `Fetched page ${page} of ${totalPages}`);
      await new Promise(r => setTimeout(r, 80));
    }

    if (allLeads.length === 0) {
      closeModal('modal-export-progress');
      showToast('No leads found matching current filters to export.', 'warning');
      return;
    }

    // Process and validate leads
    const validLeads = [];
    const seenPhones = new Set();
    const seenNames = new Set();
    let duplicateCount = 0;
    let failedCount = 0;

    allLeads.forEach(lead => {
      const companyName = (lead.company_name || lead.name || '').trim();
      const rawPhone = lead.phone || '';
      const email = (lead.email || '').trim();
      const city = lead.city || lead.location || '';

      // 1. Check basic name requirement
      if (!companyName || companyName.toLowerCase() === 'unknown') {
        failedCount++;
        return;
      }

      // 2. Perform duplicate checks in-memory
      const cleanedPhone = rawPhone.replace(/\D/g, '');
      const nameKey = `${companyName.toLowerCase().trim()}_${city.toLowerCase().trim()}`;
      
      let isDup = false;
      if (cleanedPhone && seenPhones.has(cleanedPhone)) {
        isDup = true;
      } else if (seenNames.has(nameKey)) {
        isDup = true;
      }

      if (isDup) {
        duplicateCount++;
        return;
      }

      // Track uniqueness
      if (cleanedPhone) seenPhones.add(cleanedPhone);
      seenNames.add(nameKey);

      // 3. Email and Phone validation
      const isEmailValid = validateEmail(email);
      const isPhoneValid = validatePhone(rawPhone);

      // If both phone and email are invalid, it's failed
      if (!isEmailValid && !isPhoneValid) {
        failedCount++;
        return;
      }

      validLeads.push(lead);
    });

    // Generate sheet rows
    const excelRows = validLeads.map(lead => {
      const aiData = lead.ai_enriched_data || {};
      const contactPerson = aiData.contact_person || '';
      const designation = aiData.designation || '';
      const city = lead.city || lead.location || '';
      const state = lead.state || '';

      return {
        'Company Name': lead.company_name || lead.name || '',
        'Contact Person': contactPerson,
        'Designation': designation,
        'Email': lead.email || '',
        'Mobile': lead.phone || '',
        'Website': lead.website || '',
        'Address': lead.address || '',
        'City': city,
        'State': state
      };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelRows);

    // Freeze header row
    ws['!views'] = [
      { state: 'frozen', ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' }
    ];

    // Auto-adjust column widths
    const colKeys = ['Company Name', 'Contact Person', 'Designation', 'Email', 'Mobile', 'Website', 'Address', 'City', 'State'];
    ws['!cols'] = colKeys.map(key => {
      let maxLen = key.length;
      excelRows.forEach(row => {
        const valStr = row[key] ? String(row[key]) : '';
        if (valStr.length > maxLen) maxLen = valStr.length;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    // Add Summary sheet inside workbook
    const extractionDate = new Date().toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const summarySheetData = [
      { 'Metrics': 'Extraction Date', 'Values': extractionDate },
      { 'Metrics': 'Total Pages Processed', 'Values': totalPages },
      { 'Metrics': 'Total Leads Found', 'Values': allLeads.length },
      { 'Metrics': 'Valid Leads Exported', 'Values': validLeads.length },
      { 'Metrics': 'Duplicate Leads Removed', 'Values': duplicateCount },
      { 'Metrics': 'Failed Records', 'Values': failedCount }
    ];
    const wsSummary = XLSX.utils.json_to_sheet(summarySheetData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Generate output blob and file size
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    
    const fileSizeKB = (blob.size / 1024).toFixed(2);
    const fileSizeStr = fileSizeKB > 1024 ? `${(fileSizeKB / 1024).toFixed(2)} MB` : `${fileSizeKB} KB`;
    
    const execTime = ((Date.now() - startTime) / 1000).toFixed(1) + 's';

    // Store globally for re-download
    lastExportedBlob = blob;
    lastExportedFilename = `Leads_Consolidated_Export_${dateStamp()}.xlsx`;

    // Close progress modal
    closeModal('modal-export-progress');

    // Display summary modal stats
    document.getElementById('summary-total-pages').textContent = totalPages;
    document.getElementById('summary-total-leads').textContent = allLeads.length;
    document.getElementById('summary-valid-leads').textContent = validLeads.length;
    document.getElementById('summary-duplicate-leads').textContent = duplicateCount;
    document.getElementById('summary-failed-leads').textContent = failedCount;
    document.getElementById('summary-file-size').textContent = fileSizeStr;
    document.getElementById('summary-exec-time').textContent = execTime;

    // Attach click handler to Download Again button
    const dlBtn = document.getElementById('btn-download-again');
    if (dlBtn) {
      dlBtn.onclick = () => {
        downloadBlob(lastExportedBlob, lastExportedFilename);
        showToast('📥 Downloading Excel file again', 'success');
      };
    }

    // Open Summary Modal
    openModal('modal-export-summary');

    // Automatically trigger initial download
    downloadBlob(lastExportedBlob, lastExportedFilename);
    showToast(`✅ Excel file exported successfully (${validLeads.length} leads)`, 'success');

  } catch (err) {
    console.error('Export Excel failed:', err);
    closeModal('modal-export-progress');
    showToast(`Export error: ${err.message}`, 'error');
  }
}

// ── Helpers ───────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

function avgRating(leads) {
  const rated = leads.filter(l => l.rating > 0);
  if (!rated.length) return 'N/A';
  return (rated.reduce((s,l) => s + parseFloat(l.rating), 0) / rated.length).toFixed(1);
}
