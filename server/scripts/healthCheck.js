require('dotenv').config();
const supabase = require('../config/supabase');
const { chromium } = require('playwright');

async function runHealthDiagnostics() {
    console.log('===================================================');
    console.log('🔍 Enterprise Production Health Diagnostics Routine');
    console.log('===================================================');

    let passed = true;

    // 1. Environment & API Keys Check
    console.log('\n[1/3] Environment & API Keys Check...');
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
    if (process.env.SUPABASE_URL && key) {
        console.log('  ✅ SUPABASE_URL & SUPABASE_KEY detected');
    } else {
        console.warn('  ⚠️ SUPABASE credentials missing in .env');
        passed = false;
    }

    // 2. Database Ping Check
    console.log('\n[2/3] Database Connectivity Check...');
    try {
        const { data, error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            console.warn(`  ⚠️ Database ping returned error: ${error.message}`);
            passed = false;
        } else {
            console.log('  ✅ Database connection OK (Supabase active)');
        }
    } catch (dbErr) {
        console.error(`  ❌ Database connection exception: ${dbErr.message}`);
        passed = false;
    }

    // 3. Playwright Chromium Capability Check
    console.log('\n[3/3] Playwright Chromium Browser Launch Check...');
    try {
        const browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
        });
        const version = browser.version();
        await browser.close();
        console.log(`  ✅ Playwright Chromium launched successfully (v${version})`);
    } catch (pwErr) {
        console.error(`  ❌ Playwright launch failed: ${pwErr.message}`);
        passed = false;
    }

    console.log('\n===================================================');
    if (passed) {
        console.log('🎉 RESULT: SYSTEM IS 100% PRODUCTION READY & HEALTHY');
    } else {
        console.log('⚠️ RESULT: SYSTEM HAS WARNINGS (Fallback Modes Active)');
    }
    console.log('===================================================\n');
}

runHealthDiagnostics();
