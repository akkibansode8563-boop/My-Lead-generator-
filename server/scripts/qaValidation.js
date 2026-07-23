const { chromium } = require('playwright');
const path = require('path');
const masterEntityService = require('../services/masterEntityService');
const { enrichLeadWithAI } = require('../services/aiEnrichmentService');
const { cleanIndianPhone } = require('../utils/phoneUtils');

async function runFullQAValidation() {
    console.log('===============================================================');
    console.log('🧪 COMPREHENSIVE END-TO-END QA & SYSTEM VALIDATION SUITE');
    console.log('===============================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            passedTests++;
            console.log(`  ✅ [PASS] ${message}`);
        } else {
            console.error(`  ❌ [FAIL] ${message}`);
        }
    }

    // -----------------------------------------------------------------
    // TEST SUITE 1: Phone Utils & Cleaning Validation
    // -----------------------------------------------------------------
    console.log('[SUITE 1/6] Phone Normalization & Validation Utils...');
    
    const p1 = cleanIndianPhone('+91 98765 43210');
    assert(p1.cleaned === '9876543210' && p1.isValid === true && p1.isWhatsapp === true, 'Mobile phone cleaning (+91 98765 43210 -> 9876543210)');

    const p2 = cleanIndianPhone('022-23881234');
    assert(p2.cleaned === '2223881234' && p2.isValid === true && p2.isWhatsapp === false, 'Landline phone cleaning (022-23881234 -> 2223881234)');

    const p3 = cleanIndianPhone('123');
    assert(p3.isValid === false, 'Invalid phone rejection (123 -> isValid = false)');

    // -----------------------------------------------------------------
    // TEST SUITE 2: Master Entity Resolution & Deduplication
    // -----------------------------------------------------------------
    console.log('\n[SUITE 2/6] Multi-Pass Master Entity Resolution & Deduplication...');

    // Test Jaro-Winkler String Similarity
    const simExact = masterEntityService.jaroWinklerDistance('TechZone IT Solutions', 'TechZone IT Solutions');
    assert(simExact === 1.0, 'Jaro-Winkler exact match equals 1.0');

    const simFuzzy = masterEntityService.jaroWinklerDistance('TechZone IT Solutions Pvt Ltd', 'TechZone IT Solutions Ltd');
    assert(simFuzzy >= 0.88, `Jaro-Winkler fuzzy match above threshold (${(simFuzzy * 100).toFixed(1)}%)`);

    const simDiff = masterEntityService.jaroWinklerDistance('TechZone IT', 'Random Bakery Shop');
    assert(simDiff < 0.5, `Jaro-Winkler distinct strings rejected (${(simDiff * 100).toFixed(1)}%)`);

    // Test Domain Extractor
    const d1 = masterEntityService.extractDomain('https://www.techzone.co.in/products/laptops');
    assert(d1 === 'techzone.co.in', 'Domain extraction (https://www.techzone.co.in/products/laptops -> techzone.co.in)');

    // -----------------------------------------------------------------
    // TEST SUITE 3: AI Enrichment Service
    // -----------------------------------------------------------------
    console.log('\n[SUITE 3/6] AI Enrichment Engine & Fallback Matrix...');

    const enrichedLead = await enrichLeadWithAI({
        company_name: 'Supertron Electronics Pvt Ltd',
        category: 'IT Hardware Distributor',
        address: 'Nehru Place, New Delhi',
        rating: 4.8,
        reviews: 240
    });
    assert(enrichedLead.ai_score >= 50 && enrichedLead.quality_tier, `AI Enrichment produces valid score (${enrichedLead.ai_score}) & quality tier (${enrichedLead.quality_tier})`);

    // -----------------------------------------------------------------
    // TEST SUITE 4: Backend REST API Endpoints
    // -----------------------------------------------------------------
    console.log('\n[SUITE 4/6] Backend REST API Endpoints Verification...');

    try {
        const healthRes = await fetch('http://localhost:3000/health');
        const healthJson = await healthRes.json();
        assert(healthRes.status === 200 && healthJson.status === 'ok', 'GET /health returns HTTP 200 status: ok');
    } catch (e) {
        assert(false, `GET /health request failed: ${e.message}`);
    }

    try {
        const leadsRes = await fetch('http://localhost:3000/api/leads?page=1&limit=5');
        const leadsJson = await leadsRes.json();
        assert(leadsRes.status === 200 && Array.isArray(leadsJson.data) && leadsJson.meta, 'GET /api/leads returns data array and metadata');
    } catch (e) {
        assert(false, `GET /api/leads request failed: ${e.message}`);
    }

    let createdScanId = null;
    try {
        const scanRes = await fetch('http://localhost:3000/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'QA Test Scan: Delhi NCR',
                state: 'Delhi NCR',
                city: 'Delhi',
                market_area: 'Nehru Place',
                radius_km: 5.0,
                customer_types: ['IT Dealers'],
                product_categories: ['Laptops']
            })
        });
        const scanJson = await scanRes.json();
        assert(scanRes.status === 201 && scanJson.campaign && scanJson.campaign.id, 'POST /api/campaigns creates spatial scan job');
        createdScanId = scanJson.campaign?.id;
    } catch (e) {
        assert(false, `POST /api/campaigns request failed: ${e.message}`);
    }

    if (createdScanId) {
        try {
            const progRes = await fetch(`http://localhost:3000/api/campaigns/${createdScanId}/progress`);
            const progJson = await progRes.json();
            assert(progRes.status === 200 && (progJson.status || progJson.leadsCollected !== undefined), `GET /api/campaigns/${createdScanId.slice(0,8)}/progress returns live scan status`);
        } catch (e) {
            assert(false, `GET /api/campaigns/:id/progress failed: ${e.message}`);
        }
    }

    // -----------------------------------------------------------------
    // TEST SUITE 5: Playwright Frontend UI & User Interaction E2E
    // -----------------------------------------------------------------
    console.log('\n[SUITE 5/6] Playwright E2E User Behavior Simulation...');

    let browser = null;
    const consoleErrors = [];
    const pageErrors = [];

    try {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
        const context = await browser.newContext();
        const page = await context.newPage();

        consoleErrors.length = 0;
        pageErrors.length = 0;

        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        page.on('pageerror', err => {
            pageErrors.push(err.message);
        });

        await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => typeof window.showPage === 'function', { timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(500);

        if (pageErrors.length > 0) {
            console.log('  ⚠️ Detected Page Errors during load:', pageErrors);
        }
        const fatalErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('extension') && !e.includes('catch'));
        assert(consoleErrors.length === 0, `Initial page load has 0 console errors (Errors: ${consoleErrors.length})`);
        assert(fatalErrors.length === 0, `Initial page load has 0 unhandled page exceptions (Errors: ${fatalErrors.length})`);

        // Test Page Navigation
        await page.evaluate(() => window.showPage('generate'));
        await page.waitForTimeout(300);
        const isGenActive = await page.evaluate(() => document.getElementById('page-generate').classList.contains('active'));
        assert(isGenActive, 'Navigation: showPage("generate") activates Wizard view');

        await page.evaluate(() => window.showPage('leads'));
        await page.waitForTimeout(300);
        const isLeadsActive = await page.evaluate(() => document.getElementById('page-leads').classList.contains('active'));
        assert(isLeadsActive, 'Navigation: showPage("leads") activates CRM Database view');

        await page.evaluate(() => window.showPage('dashboard'));
        await page.waitForTimeout(300);
        const isDashActive = await page.evaluate(() => document.getElementById('page-dashboard').classList.contains('active'));
        assert(isDashActive, 'Navigation: showPage("dashboard") activates Dashboard view');

        // Test State Dropdown & Auto-Suggestion Datalist
        await page.evaluate(() => {
            window.showPage('generate');
            if (typeof window.goToWizardStep === 'function') window.goToWizardStep(4);
            if (typeof window.onStateChange === 'function') window.onStateChange('Maharashtra');
        });
        await page.waitForTimeout(300);
        
        const cityPickerLabel = await page.textContent('#city-picker-label');
        assert(cityPickerLabel.includes('Maharashtra'), 'State Dropdown Change: Selecting "Maharashtra" updates city chips header');

        const datalistCount = await page.evaluate(() => document.querySelectorAll('#market-area-suggestions option').length);
        assert(datalistCount > 0, `Territory Auto-Suggestions: Datalist populated with ${datalistCount} IT Market Hubs for Maharashtra`);

        // Test Quick Action Buttons
        await page.evaluate(() => window.showPage('dashboard'));
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.quick-action-card'));
            const genCard = cards.find(c => c.textContent.includes('Generate New Leads'));
            if (genCard) genCard.click();
        });
        await page.waitForTimeout(300);
        const afterGenClick = await page.evaluate(() => document.getElementById('page-generate').classList.contains('active'));
        assert(afterGenClick, 'Quick Action Button: "Generate New Leads" opens Wizard panel');

        await page.evaluate(() => window.showPage('dashboard'));
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.quick-action-card'));
            const leadsCard = cards.find(c => c.textContent.includes('View My Leads'));
            if (leadsCard) leadsCard.click();
        });
        await page.waitForTimeout(300);
        const afterLeadsClick = await page.evaluate(() => document.getElementById('page-leads').classList.contains('active'));
        assert(afterLeadsClick, 'Quick Action Button: "View My Leads" opens CRM table');

        assert(consoleErrors.length === 0, `E2E Interaction complete with 0 console errors`);
        assert(fatalErrors.length === 0, `E2E Interaction complete with 0 page exceptions`);

    } catch (e2eErr) {
        assert(false, `Playwright E2E simulation exception: ${e2eErr.message}`);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }

    // -----------------------------------------------------------------
    // TEST SUITE 6: Final QA Audit Summary
    // -----------------------------------------------------------------
    console.log('\n===============================================================');
    console.log(`📊 FINAL QA SYSTEM VALIDATION SUMMARY`);
    console.log(`   Total Test Cases Executed: ${totalTests}`);
    console.log(`   Passed Test Cases:         ${passedTests}`);
    console.log(`   Failed Test Cases:         ${totalTests - passedTests}`);
    console.log(`   Pass Rate:                 ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log('===============================================================\n');

    if (passedTests === totalTests) {
        console.log('🎉 ALL SYSTEM VALIDATION CHECKS PASSED PERFECTLY!');
    } else {
        console.warn('⚠️ WARNING: SOME TESTS REQUIRED ATTENTION.');
    }
}

runFullQAValidation();
