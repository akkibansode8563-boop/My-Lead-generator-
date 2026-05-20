/* =============================================
   animations.js — GSAP UI Enhancements
   ============================================= */

'use strict';

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  // Animate Auth Screen if it's visible
  const authScreen = document.getElementById('auth-screen');
  if (authScreen && getComputedStyle(authScreen).display !== 'none') {
    gsap.from('.auth-logo-icon', { y: -20, opacity: 0, duration: 0.8, ease: 'back.out(1.7)' });
    gsap.from('.auth-logo-text', { x: -20, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power2.out' });
    gsap.from('.auth-title', { y: 20, opacity: 0, duration: 0.6, delay: 0.4 });
    gsap.from('.auth-subtitle', { y: 20, opacity: 0, duration: 0.6, delay: 0.5 });
    gsap.from('.auth-tabs', { y: 20, opacity: 0, duration: 0.6, delay: 0.6 });
    gsap.from('#auth-screen .form-group, #auth-screen .btn', { y: 15, opacity: 0, duration: 0.5, stagger: 0.1, delay: 0.7 });
  }
});

// Intercept `showPage` from ui.js to animate page changes
const originalShowPage = window.showPage;
if (typeof originalShowPage === 'function') {
  window.showPage = function(pageId) {
    originalShowPage(pageId); // call original

    // Animate new page content
    const page = document.getElementById(`page-${pageId}`);
    if (page) {
      gsap.fromTo(page, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }

    // Animate Header
    gsap.fromTo('#page-title', { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' });
    gsap.fromTo('#page-subtitle', { opacity: 0, x: -15 }, { opacity: 1, x: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' });

    // Animate Stats if dashboard
    if (pageId === 'dashboard') {
      gsap.fromTo('.stat-card', 
        { scale: 0.95, opacity: 0, y: 10 }, 
        { scale: 1, opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'back.out(1.2)', delay: 0.1 }
      );
    }
    
    // Animate CRM table if leads page
    if (pageId === 'leads') {
      gsap.fromTo('.leads-table tr', 
        { opacity: 0, x: -10 }, 
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.03, ease: 'power1.out', delay: 0.2 }
      );
    }
  };
}
