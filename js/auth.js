/* =============================================
   auth.js — Authentication & User Management
   ============================================= */

'use strict';

// ── Helpers ──────────────────────────────────
function showAuthTab(tab) {
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
}

function togglePwd(id) {
  const el = document.getElementById(id);
  el.type = el.type === 'password' ? 'text' : 'password';
}

// ── Auth Actions ──────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in...';

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('lf_users') || '[]');
    const user = users.find(u => u.email === email && u.password === btoa(password));

    if (user) {
      loginSuccess(user);
    } else {
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
      showToast('Invalid email or password.', 'error');
    }
  }, 800);
}

function handleRegister(e) {
  e.preventDefault();
  const fname   = document.getElementById('reg-fname').value.trim();
  const lname   = document.getElementById('reg-lname').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const company = document.getElementById('reg-company').value.trim();
  const password = document.getElementById('reg-password').value;
  const plan    = document.getElementById('reg-plan').value;
  const btn     = document.getElementById('register-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Creating account...';

  setTimeout(() => {
    const users = JSON.parse(localStorage.getItem('lf_users') || '[]');
    if (users.find(u => u.email === email)) {
      btn.disabled = false;
      btn.innerHTML = 'Create Account';
      showToast('Email already registered. Please sign in.', 'error');
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      fname, lname,
      name: `${fname} ${lname}`,
      email, company,
      password: btoa(password),
      plan,
      createdAt: new Date().toISOString(),
      runsCount: 0,
      duplicatesSkipped: 0
    };

    users.push(newUser);
    localStorage.setItem('lf_users', JSON.stringify(users));
    loginSuccess(newUser);
  }, 800);
}

function loginDemo() {
  const demoUser = {
    id: 'demo',
    fname: 'Demo',
    lname: 'User',
    name: 'Demo User',
    email: 'demo@nexusleads.crm',
    company: 'Nexus Leads Demo',
    plan: 'pro',
    isDemo: true,
    runsCount: 3,
    duplicatesSkipped: 7
  };
  loginSuccess(demoUser, true);
}

function loginSuccess(user, isDemo = false) {
  localStorage.setItem('lf_current_user', JSON.stringify(user));
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');

  if (isDemo) {
    loadDemoData();
    document.getElementById('demo-banner').style.display = 'flex';
  }

  initApp(user);
  showToast(`Welcome back, ${user.fname || user.name}! 👋`, 'success');
}

function handleLogout() {
  if (confirm('Are you sure you want to log out?')) {
    localStorage.removeItem('lf_current_user');
    location.reload();
  }
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('lf_current_user') || 'null');
}

function updateCurrentUser(updates) {
  const user = getCurrentUser();
  if (user) {
    Object.assign(user, updates);
    localStorage.setItem('lf_current_user', JSON.stringify(user));

    // Update in users array too
    const users = JSON.parse(localStorage.getItem('lf_users') || '[]');
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) { users[idx] = user; localStorage.setItem('lf_users', JSON.stringify(users)); }
  }
}

// ── Demo Data Seeder ──────────────────────────
function loadDemoData() {
  if (getLeads().length > 0) return; // Don't overwrite existing leads

  const demoLeads = [
    { name: 'TechZone IT Solutions', phone: '+91 98765 43210', email: 'info@techzone.in', website: 'https://techzone.in', address: 'Nehru Place, New Delhi, Delhi 110019', rating: 4.5, reviews: 128, category: 'IT Distributor', location: 'Delhi', status: 'qualified', notes: 'Large volume buyer. Follow up next week.', lat: 28.549, lng: 77.252, industry: 'IT Dealers Resellers' },
    { name: 'Cyber Systems Pvt Ltd', phone: '+91 98765 11111', email: 'sales@cybersystems.co.in', website: 'https://cybersystems.co.in', address: '14 Lamington Road, Mumbai, Maharashtra 400007', rating: 4.2, reviews: 89, category: 'Computer Hardware', location: 'Mumbai', status: 'contacted', notes: 'Interested in bulk laptop order.', lat: 18.955, lng: 72.836, industry: 'IT Distributors' },
    { name: 'InfoPlex Technologies', phone: '+91 80 2222 3333', email: '', website: 'https://infoplex.in', address: 'MG Road, Bangalore, Karnataka 560001', rating: 4.8, reviews: 256, category: 'System Integrator', location: 'Bangalore', status: 'new', notes: '', lat: 12.975, lng: 77.608, industry: 'System Integrators' },
    { name: 'Allied Networks Corp', phone: '+91 44 4567 8901', email: 'contact@alliednet.in', website: '', address: '45 Anna Salai, Chennai, Tamil Nadu 600002', rating: 3.9, reviews: 45, category: 'Networking Solutions', location: 'Chennai', status: 'new', notes: '', lat: 13.067, lng: 80.265, industry: 'IT Dealers Resellers' },
    { name: 'Prime Electronics Hub', phone: '+91 40 5678 9012', email: 'prime@electronics.co.in', website: 'https://primeelectronics.in', address: 'Hi-Tech City, Hyderabad, Telangana 500081', rating: 4.6, reviews: 312, category: 'Electronics Distributor', location: 'Hyderabad', status: 'proposal', notes: 'Quote sent for 200 laptops.', lat: 17.449, lng: 78.376, industry: 'IT Distributors' },
    { name: 'DataCore Solutions', phone: '+91 20 3456 7890', email: 'info@datacore.in', website: 'https://datacore.in', address: 'Hinjewadi Phase 1, Pune, Maharashtra 411057', rating: 4.1, reviews: 67, category: 'IT Services', location: 'Pune', status: 'won', notes: 'Deal closed. Repeat customer.', lat: 18.591, lng: 73.739, industry: 'System Integrators' },
    { name: 'Rapid Tech Traders', phone: '+91 79 2345 6789', email: 'rapid@techtraders.in', website: '', address: 'Manek Chowk, Ahmedabad, Gujarat 380001', rating: 3.7, reviews: 34, category: 'Computer Retailer', location: 'Ahmedabad', status: 'lost', notes: 'Budget constraints. Check next quarter.', lat: 23.025, lng: 72.588, industry: 'Computer Retailers' },
    { name: 'Intellect Systems Ltd', phone: '+91 33 6789 0123', email: 'intellect@sys.in', website: 'https://intellect-sys.in', address: 'Salt Lake City, Kolkata, West Bengal 700064', rating: 4.3, reviews: 198, category: 'Enterprise IT', location: 'Kolkata', status: 'qualified', notes: 'Large enterprise. Decision maker: Mr. Sharma.', lat: 22.578, lng: 88.424, industry: 'Enterprise Customers' },
    { name: 'eSmart Computers', phone: '+91 141 234 5678', email: 'esmart@computers.in', website: 'https://esmartcomputers.in', address: 'Sindhi Camp, Jaipur, Rajasthan 302001', rating: 4.0, reviews: 56, category: 'Computer Store', location: 'Jaipur', status: 'new', notes: '', lat: 26.919, lng: 75.818, industry: 'IT Dealers Resellers' },
    { name: 'Secure Vision CCTV', phone: '+91 261 345 6789', email: 'info@securevision.in', website: 'https://securevision.in', address: 'Ring Road, Surat, Gujarat 395003', rating: 4.7, reviews: 423, category: 'CCTV & Surveillance', location: 'Surat', status: 'contacted', notes: 'CCTV project for 5 branches.', lat: 21.195, lng: 72.819, industry: 'IT Dealers Resellers' },
    { name: 'CloudBase Infrastructure', phone: '+91 512 456 7890', email: 'cloud@cloudbase.in', website: 'https://cloudbase.in', address: 'Kanpur, Uttar Pradesh 208001', rating: 4.4, reviews: 87, category: 'IT Infrastructure', location: 'Kanpur', status: 'new', notes: '', lat: 26.449, lng: 80.334, industry: 'System Integrators' },
    { name: 'MegaByte Store', phone: '+91 731 567 8901', email: '', website: '', address: 'Vijay Nagar, Indore, Madhya Pradesh 452001', rating: 3.8, reviews: 29, category: 'Computer Accessories', location: 'Indore', status: 'new', notes: '', lat: 22.753, lng: 75.896, industry: 'Computer Retailers' },
  ];

  demoLeads.forEach(lead => {
    lead.id = generateId();
    lead.createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
    lead.source = 'demo';
  });

  saveBulkLeads(demoLeads);

  // Demo history
  const history = [
    { id: generateId(), runId: 'demo-run-1', query: 'IT Distributor Mumbai', leadsFound: 42, timestamp: new Date(Date.now() - 3*24*60*60*1000).toISOString(), status: 'completed', duration: '2m 34s' },
    { id: generateId(), runId: 'demo-run-2', query: 'System Integrator Delhi', leadsFound: 38, timestamp: new Date(Date.now() - 1*24*60*60*1000).toISOString(), status: 'completed', duration: '3m 12s' },
    { id: generateId(), runId: 'demo-run-3', query: 'CCTV Supplier Bangalore', leadsFound: 56, timestamp: new Date(Date.now() - 2*60*60*1000).toISOString(), status: 'completed', duration: '4m 05s' },
  ];
  localStorage.setItem('lf_history', JSON.stringify(history));
}

// Auto-init on load
window.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  if (user) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    if (user.isDemo) {
      loadDemoData();
      document.getElementById('demo-banner').style.display = 'flex';
    }
    initApp(user);
  }
});
