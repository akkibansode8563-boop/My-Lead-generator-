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
  downloadBlob(blob, `Nexus_Leads_${dateStamp()}.csv`);
  showToast(`✅ Exported ${leads.length} leads as CSV`, 'success');
}

// ── Excel Export (SheetJS) ────────────────────
function exportLeadsExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Excel library not loaded. Check your internet connection.', 'error');
    return;
  }

  const leads = filteredLeads.length > 0 ? filteredLeads : getLeads();
  if (!leads.length) { showToast('No leads to export.', 'warning'); return; }

  const rows = getExportRows();

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Main leads sheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Style column widths
  ws['!cols'] = [
    { wch: 30 }, // Company Name
    { wch: 18 }, // Phone
    { wch: 28 }, // Email
    { wch: 30 }, // Website
    { wch: 40 }, // Address
    { wch: 12 }, // Rating
    { wch: 12 }, // Reviews
    { wch: 25 }, // Category
    { wch: 18 }, // Location
    { wch: 25 }, // Industry
    { wch: 15 }, // Status
    { wch: 40 }, // Notes
    { wch: 12 }, // Source
    { wch: 18 }, // Date
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  // Summary sheet
  const statusCounts = {};
  ['new','contacted','qualified','proposal','won','lost'].forEach(s => {
    statusCounts[s] = leads.filter(l => l.status === s).length;
  });

  const summaryData = [
    { Metric: 'Total Leads', Value: leads.length },
    { Metric: 'Export Date', Value: new Date().toLocaleDateString('en-IN') },
    { Metric: 'New',         Value: statusCounts.new || 0 },
    { Metric: 'Contacted',   Value: statusCounts.contacted || 0 },
    { Metric: 'Qualified',   Value: statusCounts.qualified || 0 },
    { Metric: 'Proposal Sent', Value: statusCounts.proposal || 0 },
    { Metric: 'Won',         Value: statusCounts.won || 0 },
    { Metric: 'Lost',        Value: statusCounts.lost || 0 },
    { Metric: 'With Phone',  Value: leads.filter(l => l.phone).length },
    { Metric: 'With Email',  Value: leads.filter(l => l.email).length },
    { Metric: 'With Website', Value: leads.filter(l => l.website).length },
    { Metric: 'Avg. Rating', Value: avgRating(leads) },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  // Location breakdown sheet
  const locMap = {};
  leads.forEach(l => { const loc = l.location || 'Unknown'; locMap[loc] = (locMap[loc] || 0) + 1; });
  const locData = Object.entries(locMap).sort((a,b) => b[1]-a[1]).map(([loc, count]) => ({ Location: loc, 'Lead Count': count }));

  const wsLoc = XLSX.utils.json_to_sheet(locData);
  wsLoc['!cols'] = [{ wch: 25 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsLoc, 'By Location');

  // Write and download
  XLSX.writeFile(wb, `Nexus_Leads_${dateStamp()}.xlsx`);
  showToast(`✅ Exported ${leads.length} leads as Excel (.xlsx)`, 'success');
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
