/* =============================================
   app.js — Main Application Controller
   ============================================= */

'use strict';

// ── App Initialization ────────────────────────
function initApp(user) {
  initTheme();
  initSidebar();
  updateSidebarUser();
  updateLeadsBadge();
  renderDashboard();
  showPage('dashboard');

  // Restore saved API key to wizard input if exists
  const apiKey = getApifyKey();
  if (apiKey) {
    const inp = document.getElementById('apify-key-input');
    if (inp) inp.value = apiKey;
  }

  console.log(`%c🎯 Nexus Leads CRM%c loaded for ${user.name || user.email}`,
    'font-size:16px;font-weight:bold;color:#4f8ef7',
    'font-size:14px;color:#8b9ab5'
  );
}

// ── Global Error Handler ──────────────────────
window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  if (event.reason?.message) {
    showToast(`Error: ${event.reason.message}`, 'error', 5000);
  }
});

// ── Keyboard Shortcuts ────────────────────────
document.addEventListener('keydown', e => {
  // Only when not in input
  if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

  switch(e.key) {
    case '1': showPage('dashboard');  break;
    case '2': showPage('generate');   break;
    case '3': showPage('leads');      break;
    case '4': showPage('history');    break;
    case '5': showPage('analytics');  break;
    case 'd': toggleTheme();          break;
    case '/': // Focus search
      if (document.getElementById('page-leads').classList.contains('active')) {
        document.getElementById('leads-search')?.focus();
        e.preventDefault();
      }
      break;
  }
});

// ── Window Resize: handle sidebar ─────────────
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (window.innerWidth > 768) {
      document.getElementById('sidebar').classList.remove('mobile-open');
      document.getElementById('sidebar-overlay').classList.remove('visible');
    }
  }, 150);
});

// ── Prevent accidental navigation away during scrape ─
window.addEventListener('beforeunload', e => {
  const running = document.getElementById('generate-running')?.style.display !== 'none';
  if (running) {
    e.preventDefault();
    e.returnValue = 'A scrape is in progress. Are you sure you want to leave?';
    return e.returnValue;
  }
});

// ── PWA / Service Worker (optional) ──────────
if ('serviceWorker' in navigator) {
  // Could register a SW here for offline support
}

// ── Console Easter Egg ────────────────────────
console.log('%c🎯 Nexus Leads CRM — B2B Lead Generation Platform\n%cPowered by Apify Google Maps Scraper\n📧 Built with ❤️',
  'font-size:20px;font-weight:bold;background:linear-gradient(135deg,#4f8ef7,#00d4ff);-webkit-background-clip:text;-webkit-text-fill-color:transparent',
  'color:#8b9ab5;font-size:13px'
);
