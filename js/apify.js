/* =============================================
   apify.js — Apify Google Maps Scraper Integration
   ============================================= */

'use strict';

const APIFY_BASE     = 'https://api.apify.com/v2';
const POLL_INTERVAL  = 4000;    // ms between status polls
const MAX_POLL_TIME  = 600000;  // 10 minutes max

// ── Confirmed working actor IDs (verified live from Apify Store API) ──
// Primary: compass/crawler-google-places — ID: nwua9Gu5YrADL7ZDj
// 25M+ runs, 416K users, 4.76★ rating — the most used Google Maps scraper
const ACTOR_IDS = [
  'nwua9Gu5YrADL7ZDj',                   // ✅ CONFIRMED: compass/crawler-google-places
  'compass~crawler-google-places',        // same actor by slug
  'WnMxbsRLNbPeYL6ge',                   // Google Maps Email Extractor (backup)
  'lukaskrivka~google-maps-with-contact-details',
];

let generateCancelled = false;
let pollTimer = null;

// ── Pre-cache the confirmed actor ID so no resolution delay ──────────
if (!localStorage.getItem('lf_actor_id')) {
  localStorage.setItem('lf_actor_id', 'nwua9Gu5YrADL7ZDj');
}
// NOTE: Enter your Apify API key in Settings → API Configuration

// ── Get stored API key ─────────────────────────
function getApifyKey() {
  const stored = localStorage.getItem('lf_apify_key');
  if (!stored) return null;
  try { return atob(stored); } catch(e) { return null; }
}

// ── Resolve the first working actor ID ────────
async function resolveActorId(apiKey) {
  const customId = localStorage.getItem('lf_actor_id');
  if (customId) return customId;

  for (const id of ACTOR_IDS) {
    try {
      const resp = await fetch(`${APIFY_BASE}/acts/${id}`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.data?.id) {
          console.log(`✅ Resolved actor: ${id}`);
          localStorage.setItem('lf_actor_id', id);
          return id;
        }
      }
    } catch(e) { /* try next */ }
  }
  return null;
}

// ── Build search queries ───────────────────────
function buildSearchQueries(config) {
  const { industries, products, locations } = config;
  const queries = [];

  // If user selected specific cities use them; otherwise default to all MH+Goa cities
  const allMHCities = [
    'Nagpur','Wardha','Chandrapur','Bhandara','Gondia','Amravati','Akola','Yavatmal','Washim',
    'Nashik','Ahmednagar','Dhule','Jalgaon','Nandurbar','Malegaon',
    'Pune','Pimpri Chinchwad','Chakan','Talegaon','Baramati','Satara','Sangli','Solapur',
    'Chhatrapati Sambhajinagar','Jalna','Beed','Latur','Osmanabad','Nanded','Parbhani','Hingoli',
    'Kolhapur','Ratnagiri','Sindhudurg','Panaji','Margao','Mapusa','Vasco da Gama',
    'Mumbai','Navi Mumbai','Thane','Kalyan','Dombivli','Vasai','Virar','Palghar','Bhiwandi'
  ];
  const locs = locations.length > 0 ? locations : allMHCities.slice(0, 10);

  industries.forEach(industry => {
    locs.forEach(loc => queries.push(`${industry} in ${loc}`));
  });

  products.slice(0, 3).forEach(product => {
    locs.slice(0, 3).forEach(loc => queries.push(`${product} dealer in ${loc}`));
  });

  return [...new Set(queries)];
}

// ── Main Apify Generate Flow ───────────────────
async function startApifyGenerate() {
  generateCancelled = false;

  const apiKey = getApifyKey() || document.getElementById('apify-key-input')?.value.trim();

  const config = {
    apiKey,
    industries:     getSelectedChips('industries-chips'),
    bizTypes:       getSelectedChips('biz-type-chips'),
    products:       getSelectedChips('products-chips'),
    locations:      [...locationTags],
    country:        'India',
    language:       document.getElementById('gm-language')?.value || 'en',
    maxResults:     parseInt(document.getElementById('max-results')?.value || 50),
    minRating:      parseFloat(document.getElementById('min-rating')?.value || 3.5),
    minReviews:     parseInt(document.getElementById('min-reviews')?.value || 5),
    companySize:    document.getElementById('company-size')?.value || 'any',
    defaultStatus:  document.getElementById('default-status')?.value || 'new',
    skipDuplicates: document.getElementById('skip-duplicates')?.checked ?? true,
    requirePhone:   document.getElementById('require-phone')?.checked ?? true,
    requireWebsite: document.getElementById('require-website')?.checked ?? false,
    includeKw:      (document.getElementById('include-keywords')?.value || '').split(',').map(k => k.trim()).filter(Boolean),
    excludeKw:      (document.getElementById('exclude-keywords')?.value || '').split(',').map(k => k.trim()).filter(Boolean),
    excludeClosed:  document.getElementById('exclude-closed')?.checked ?? true,
  };

  if (config.industries.length === 0 && config.products.length === 0) {
    showToast('Please select at least one industry or product category.', 'warning');
    wizardPrev(6); return;
  }

  setGenerateState('running');
  setGenStatus('Initializing...', 'Preparing lead generation');
  setGenProgress(5, 'Starting...');
  setGenCount(0);

  const queries = buildSearchQueries(config);

  // No API key → demo mode
  if (!apiKey) {
    await runDemoMode(queries, config);
    return;
  }

  setGenStatus('Connecting to Apify...', 'Finding Google Maps Scraper actor');
  setGenProgress(8, 'Resolving actor...');

  const actorId = await resolveActorId(apiKey);

  try {
    if (!actorId) {
      showToast('⚠️ Could not find a working Apify actor. Falling back to Demo Mode.', 'warning', 5000);
      await runDemoMode(queries, config, true);
      return;
    }
    await runApifyActor(queries, config, actorId);
  } catch(err) {
    const isActorErr = err.message?.toLowerCase().includes('actor') ||
                       err.message?.toLowerCase().includes('not found') ||
                       err.message?.toLowerCase().includes('unauthorized') ||
                       err.message?.toLowerCase().includes('403');

    if (isActorErr) {
      localStorage.removeItem('lf_actor_id');
      showToast(`⚠️ ${err.message} — Switching to Demo Mode.`, 'warning', 6000);
      await runDemoMode(queries, config, true);
    } else {
      showToast(`Error: ${err.message}`, 'error', 6000);
      setGenerateState('idle');
    }
  }
}

// ── Real Apify Run ─────────────────────────────
async function runApifyActor(queries, config, actorId) {
  const { apiKey, maxResults, language } = config;

  setGenStatus('Launching Google Maps Scraper...', `Actor: ${actorId}`);
  setGenProgress(12, 'Starting actor run');

  const actorInput = {
    searchStringsArray:          queries,
    maxCrawledPlacesPerSearch:   maxResults,
    language,
    includeReviews:              false,
    includeImages:               false,
    includeOpeningHours:         false,
    maxImages:                   0,
    maxReviews:                  0,
  };

  const runResp = await apifyFetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`,
    'POST',
    actorInput,
    apiKey
  );

  const runId  = runResp?.data?.id;
  const dataId = runResp?.data?.defaultDatasetId;

  if (!runId) throw new Error('Failed to start Apify run. Check your API key and actor access.');

  setGenStatus(`Run started (ID: ${runId.slice(0, 8)}...)`, 'Scraping Google Maps — this may take a few minutes');
  setGenProgress(20, 'Actor running...');

  addRunToHistory({
    runId,
    query: queries.slice(0, 2).join(', ') + (queries.length > 2 ? '...' : ''),
    leadsFound: 0,
    timestamp: new Date().toISOString(),
    status: 'running',
    duration: '—'
  });

  // Poll for completion
  await new Promise((resolve, reject) => {
    const startTime = Date.now();
    let progress = 20;
    let datasetId = dataId;

    const poll = async () => {
      if (generateCancelled) { reject(new Error('Cancelled')); return; }
      if (Date.now() - startTime > MAX_POLL_TIME) {
        reject(new Error('Timeout: scrape took too long.')); return;
      }

      try {
        const runData = await apifyFetch(`${APIFY_BASE}/actor-runs/${runId}`, 'GET', null, apiKey);
        const status  = runData?.data?.status;

        const elapsed    = Math.round((Date.now() - startTime) / 1000);
        const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

        setGenStatus(`Scraping in progress (${status})...`, `Elapsed: ${elapsedStr}`);
        progress = Math.min(progress + 2, 85);
        setGenProgress(progress, `Status: ${status}`);

        if (datasetId) {
          try {
            const info = await apifyFetch(`${APIFY_BASE}/datasets/${datasetId}`, 'GET', null, apiKey);
            const count = info?.data?.itemCount || 0;
            if (count > 0) setGenCount(count);
          } catch(e) {}
        }

        if (status === 'SUCCEEDED') {
          setGenProgress(90, 'Fetching results...');
          setGenStatus('Downloading leads...', 'Saving to your CRM');

          const results = await fetchAllDatasetItems(datasetId, config, apiKey);
          setGenProgress(100, 'Done!');

          const { imported, dupes, filtered } = importLeads(results, {
            skipDuplicates: config.skipDuplicates,
            requirePhone:   config.requirePhone,
            requireWebsite: config.requireWebsite,
            minRating:      config.minRating,
            minReviews:     config.minReviews,
            defaultStatus:  config.defaultStatus,
            includeKw:      config.includeKw,
            excludeKw:      config.excludeKw,
            excludeClosed:  config.excludeClosed,
          });

          updateLastRun({ leadsFound: imported, status: 'completed', duration: elapsedStr });
          const user = getCurrentUser();
          if (user) updateCurrentUser({ runsCount: (user.runsCount || 0) + 1 });

          finishGenerate(imported, dupes, filtered);
          updateLeadsBadge();
          renderDashboard();
          resolve();

        } else if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
          updateLastRun({ status: 'failed' });
          reject(new Error(`Apify run ${status.toLowerCase()}. Check your Apify console for details.`));
        } else {
          pollTimer = setTimeout(poll, POLL_INTERVAL);
        }

      } catch(err) {
        reject(err);
      }
    };
    poll();
  });
}

async function fetchAllDatasetItems(datasetId, config, apiKey) {
  const allItems = [];
  const BATCH = 250;
  let offset = 0;

  while (true) {
    if (generateCancelled) break;
    const batch = await apifyFetch(
      `${APIFY_BASE}/datasets/${datasetId}/items?limit=${BATCH}&offset=${offset}`,
      'GET', null, apiKey
    );
    if (!Array.isArray(batch) || batch.length === 0) break;
    batch.forEach(item => { item._runId = datasetId; });
    allItems.push(...batch);
    setGenCount(allItems.length);
    offset += batch.length;
    if (batch.length < BATCH) break;
  }

  return allItems;
}

// ── Demo Mode ─────────────────────────────────
async function startDemoMode() {
  const queries = buildSearchQueries({
    industries: getSelectedChips('industries-chips'),
    products:   getSelectedChips('products-chips'),
    locations:  [...locationTags],
  });
  await runDemoMode(queries, {
    skipDuplicates: true, requirePhone: false, requireWebsite: false,
    minRating: 0, minReviews: 0, defaultStatus: 'new',
    includeKw: [], excludeKw: [], excludeClosed: true
  });
}

async function runDemoMode(queries, config, fallback = false) {
  if (fallback) {
    setGenStatus('Running in Demo Mode...', 'Using realistic sample data');
  }
  setGenerateState('running');

  const industries = getSelectedChips('industries-chips');
  const locs = [...locationTags].length > 0 ? [...locationTags] : ['Nagpur', 'Pune', 'Mumbai'];

  const DEMO_POOL = [
    { name: 'TechZone IT Solutions', phone: '+91 98765 43210', email: 'info@techzone.in', website: 'https://techzone.in', address: 'Dharampeth, Nagpur, Maharashtra 440010', rating: 4.5, reviews: 128, category: 'IT Dealer' },
    { name: 'Cyber Systems Pvt Ltd', phone: '+91 98765 11111', email: 'sales@cybersystems.in', website: 'https://cybersystems.in', address: 'Lamington Road, Mumbai, Maharashtra 400007', rating: 4.2, reviews: 89, category: 'Computer Hardware' },
    { name: 'InfoPlex Technologies', phone: '+91 20 2222 3333', email: '', website: 'https://infoplex.in', address: 'FC Road, Pune, Maharashtra 411016', rating: 4.8, reviews: 256, category: 'System Integrator' },
    { name: 'Allied Networks Corp', phone: '+91 712 456 7890', email: 'contact@alliednet.in', website: '', address: 'Sadar, Nagpur, Maharashtra 440001', rating: 3.9, reviews: 45, category: 'Networking Solutions' },
    { name: 'Prime Electronics Hub', phone: '+91 253 567 8901', email: 'prime@electronics.in', website: 'https://primeelectronics.in', address: 'College Road, Nashik, Maharashtra 422005', rating: 4.6, reviews: 312, category: 'Electronics Distributor' },
    { name: 'DataCore Solutions', phone: '+91 712 234 5678', email: 'info@datacore.in', website: 'https://datacore.in', address: 'Civil Lines, Nagpur, Maharashtra 440001', rating: 4.1, reviews: 67, category: 'IT Services' },
    { name: 'Rapid Tech Traders', phone: '+91 712 345 6789', email: 'rapid@techtraders.in', website: '', address: 'Itwari, Nagpur, Maharashtra 440002', rating: 3.7, reviews: 34, category: 'Computer Retailer' },
    { name: 'Intellect Systems Ltd', phone: '+91 240 678 9012', email: 'intellect@sys.in', website: 'https://intellect-sys.in', address: 'Aurangabad, Maharashtra 431001', rating: 4.3, reviews: 198, category: 'Enterprise IT' },
    { name: 'eSmart Computers', phone: '+91 22 4567 8901', email: 'esmart@computers.in', website: 'https://esmartcomputers.in', address: 'Andheri, Mumbai, Maharashtra 400069', rating: 4.0, reviews: 56, category: 'Computer Store' },
    { name: 'Secure Vision CCTV', phone: '+91 832 345 6789', email: 'info@securevision.in', website: 'https://securevision.in', address: 'Panaji, Goa 403001', rating: 4.7, reviews: 423, category: 'CCTV & Surveillance' },
    { name: 'NetLink Infrastructure', phone: '+91 712 456 7890', email: 'info@netlink.in', website: 'https://netlink.in', address: 'Wardha Road, Nagpur, Maharashtra 440015', rating: 4.4, reviews: 87, category: 'IT Infrastructure' },
    { name: 'MegaByte Store', phone: '+91 20 5678 9012', email: '', website: '', address: 'Kothrud, Pune, Maharashtra 411038', rating: 3.8, reviews: 29, category: 'Computer Accessories' },
  ];

  const demoBusinesses = DEMO_POOL.map((b, i) => ({
    ...b,
    location: locs[i % locs.length],
    _industry: industries[i % industries.length] || 'IT Dealer',
    _runId: 'demo-' + Date.now(),
    address: `${b.address}`,
  }));

  const steps = [
    { pct: 15, status: 'Connecting to Google Maps...', sub: 'Initializing scraper session' },
    { pct: 30, status: `Processing query 1/${queries.length}...`, sub: queries[0] || 'IT businesses' },
    { pct: 50, status: `Processing query 2/${queries.length}...`, sub: queries[1] || 'Tech dealers' },
    { pct: 65, status: 'Collecting business details...', sub: 'Phone, address, ratings' },
    { pct: 80, status: 'Applying filters...', sub: 'Rating, phone, duplicates' },
    { pct: 95, status: 'Importing to CRM...', sub: 'Saving leads to your database' },
  ];

  for (let i = 0; i < steps.length; i++) {
    if (generateCancelled) return;
    setGenProgress(steps[i].pct, steps[i].sub);
    setGenStatus(steps[i].status, steps[i].sub);
    setGenCount(Math.floor((steps[i].pct / 100) * demoBusinesses.length));
    await sleep(600 + Math.random() * 400);
  }

  if (generateCancelled) return;

  const { imported, dupes, filtered } = importLeads(demoBusinesses, {
    skipDuplicates: config.skipDuplicates,
    requirePhone:   config.requirePhone,
    requireWebsite: config.requireWebsite,
    minRating:      config.minRating,
    minReviews:     config.minReviews,
    defaultStatus:  config.defaultStatus,
    includeKw:      config.includeKw,
    excludeKw:      config.excludeKw,
    excludeClosed:  config.excludeClosed,
  });

  addRunToHistory({
    id:         generateId(),
    runId:      'demo-' + Date.now(),
    query:      queries.slice(0, 2).join(', ') + (queries.length > 2 ? '...' : ''),
    leadsFound: imported,
    timestamp:  new Date().toISOString(),
    status:     'completed (demo)',
    duration:   `${(2 + Math.random() * 3).toFixed(0)}m ${Math.floor(Math.random() * 59)}s`
  });

  const user = getCurrentUser();
  if (user) updateCurrentUser({ runsCount: (user.runsCount || 0) + 1 });

  finishGenerate(imported, dupes, filtered);
  updateLeadsBadge();
  renderDashboard();
}

// ── UI State Helpers ──────────────────────────
function setGenerateState(state) {
  document.getElementById('generate-idle').style.display     = state === 'idle'    ? 'block' : 'none';
  document.getElementById('generate-running').style.display  = state === 'running' ? 'block' : 'none';
  document.getElementById('generate-done').style.display     = state === 'done'    ? 'block' : 'none';
  document.getElementById('generate-back-btn').style.display = state === 'idle'    ? 'flex'  : 'none';
}

function setGenStatus(main, sub) {
  const el1 = document.getElementById('gen-status');
  const el2 = document.getElementById('gen-substatus');
  if (el1) el1.textContent = main;
  if (el2) el2.textContent = sub;
}

function setGenProgress(pct, label) {
  const bar   = document.getElementById('gen-progress-bar');
  const pctEl = document.getElementById('gen-progress-pct');
  const lblEl = document.getElementById('gen-progress-label');
  if (bar)   bar.style.width = pct + '%';
  if (pctEl) pctEl.textContent = pct + '%';
  if (lblEl) lblEl.textContent = label;
}

function setGenCount(count) {
  const el = document.getElementById('gen-count');
  if (el) el.textContent = count;
}

function finishGenerate(imported, dupes, filtered) {
  setGenerateState('done');
  document.getElementById('gen-done-count').textContent = imported;

  let msg = `✅ ${imported} lead${imported !== 1 ? 's' : ''} imported!`;
  if (dupes > 0)    msg += ` ${dupes} duplicate${dupes !== 1 ? 's' : ''} skipped.`;
  if (filtered > 0) msg += ` ${filtered} filtered out.`;
  showToast(msg, 'success', 5000);
}

function cancelGenerate() {
  generateCancelled = true;
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  setGenerateState('idle');
  showToast('Lead generation cancelled.', 'info');
}

// ── Run History ───────────────────────────────
function addRunToHistory(run) {
  const history = JSON.parse(localStorage.getItem('lf_history') || '[]');
  run.id = run.id || generateId();
  history.unshift(run);
  if (history.length > 50) history.pop();
  localStorage.setItem('lf_history', JSON.stringify(history));
}

function updateLastRun(updates) {
  const history = JSON.parse(localStorage.getItem('lf_history') || '[]');
  if (history.length > 0) {
    Object.assign(history[0], updates);
    localStorage.setItem('lf_history', JSON.stringify(history));
  }
}

// ── Helpers ───────────────────────────────────
async function apifyFetch(url, method, body, apiKey) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
    }
  };
  if (body) opts.body = JSON.stringify(body);

  const resp = await fetch(url, opts);
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Apify API error ${resp.status}: ${errText.slice(0, 200)}`);
  }
  return resp.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
