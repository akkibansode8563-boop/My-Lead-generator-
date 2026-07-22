/**
 * phoneFixService.js — FAST VERSION
 * 
 * Fixes bad phone numbers using:
 * - Parallel processing (5 leads at a time)
 * - Fast domcontentloaded (not slow networkidle)
 * - Targeted element wait instead of full page idle
 */

const { chromium } = require('playwright');
const supabase = require('../config/supabase');
const { cleanIndianPhone } = require('../utils/phoneUtils');

const CONCURRENCY = 5; // Process 5 leads simultaneously

function isPhoneBad(phone) {
    return !cleanIndianPhone(phone).isValid;
}

async function fetchPhoneForLead(context, companyName, city, log) {
    const searchQuery = `${companyName} ${city || ''}`.trim();
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    const page = await context.newPage();
    try {
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });

        // Wait briefly for JS to render
        await page.waitForTimeout(1500);

        // Click first result if on search results page
        try {
            const firstResult = page.locator('[role="feed"] a').first();
            if (await firstResult.isVisible({ timeout: 2000 })) {
                await firstResult.click();
                await page.waitForTimeout(2000);
            }
        } catch (e) { /* already on detail page */ }

        // Extract phone from live DOM
        const phone = await page.evaluate(() => {
            // Method 1: Copy Phone button aria-label
            const phoneBtn = document.querySelector('button[data-tooltip="Copy phone number"]');
            if (phoneBtn) {
                const label = phoneBtn.getAttribute('aria-label') || '';
                const p = label.replace(/^Phone(?:\s+number)?:\s*/i, '').trim();
                if (p) return p;
            }
            // Method 2: data-item-id="phone:tel:..."
            const telBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
            if (telBtn) {
                const p = (telBtn.getAttribute('data-item-id') || '').replace('phone:tel:', '').trim();
                if (p) return p;
            }
            // Method 3: <a href="tel:...">
            const telLink = document.querySelector('a[href^="tel:"]');
            if (telLink) {
                return telLink.getAttribute('href').replace('tel:', '').trim();
            }
            return '';
        });

        return phone || '';
    } catch (e) {
        log(`  ⚡ Timeout/error for "${companyName}" — skipping`);
        return '';
    } finally {
        await page.close().catch(() => {});
    }
}

// Process a batch of leads in parallel
async function processBatch(context, batch, results, log) {
    await Promise.all(batch.map(async (lead) => {
        const newPhone = await fetchPhoneForLead(context, lead.company_name, lead.city, log);
        results.push({ id: lead.id, name: lead.company_name, phone: newPhone });
    }));
}

async function fixAllPhones(progressCallback) {
    const log = (msg) => {
        console.log(`[PhoneFix] ${msg}`);
        if (progressCallback) progressCallback(msg);
    };

    log('🚀 Starting bulk phone fix (fast parallel mode)...');

    // Step 1: Fetch all leads
    const { data: allLeads, error } = await supabase
        .from('leads')
        .select('id, company_name, phone, city, source')
        .order('created_at', { ascending: true });

    if (error) throw new Error('Failed to fetch leads: ' + error.message);
    log(`📊 Loaded ${allLeads.length} total leads.`);

    // Step 2: Remove duplicates (same company_name + city → keep first)
    const seen = new Map();
    const duplicateIds = [];
    for (const lead of allLeads) {
        const key = `${(lead.company_name || '').toLowerCase().trim()}|${(lead.city || '').toLowerCase().trim()}`;
        if (seen.has(key)) {
            duplicateIds.push(lead.id);
        } else {
            seen.set(key, lead.id);
        }
    }

    if (duplicateIds.length > 0) {
        log(`🗑️ Removing ${duplicateIds.length} duplicate entries...`);
        for (let i = 0; i < duplicateIds.length; i += 50) {
            await supabase.from('leads').delete().in('id', duplicateIds.slice(i, i + 50));
        }
        log(`✅ Removed ${duplicateIds.length} duplicates.`);
    }

    // Step 3: Find leads with bad phones
    const unique = allLeads.filter(l => !duplicateIds.includes(l.id));
    const badLeads = unique.filter(l => isPhoneBad(l.phone));
    log(`🔍 Found ${badLeads.length} leads with bad/missing phones (out of ${unique.length} unique leads).`);
    log(`⚡ Processing ${CONCURRENCY} leads at a time...`);

    if (badLeads.length === 0) {
        return { fixed: 0, failed: 0, deleted: duplicateIds.length, total: unique.length };
    }

    // Step 4: Launch ONE browser, run batches of CONCURRENCY tabs
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    });

    const allResults = [];
    let processed = 0;

    try {
        for (let i = 0; i < badLeads.length; i += CONCURRENCY) {
            const batch = badLeads.slice(i, i + CONCURRENCY);
            const batchResults = [];
            log(`[${processed + 1}–${Math.min(processed + CONCURRENCY, badLeads.length)}/${badLeads.length}] Processing batch...`);

            await processBatch(context, batch, batchResults, log);

            // Log each result and collect
            for (const r of batchResults) {
                if (r.phone && !isPhoneBad(r.phone)) {
                    log(`  ✅ ${r.name} → ${r.phone}`);
                } else {
                    log(`  ⚠️  ${r.name} → no phone found`);
                }
                allResults.push(r);
            }

            processed += batch.length;

            // Bulk update this batch in DB
            const toUpdate = batchResults.map(r => {
                const cleanedPhoneInfo = cleanIndianPhone(r.phone);
                return {
                    id: r.id,
                    phone: cleanedPhoneInfo.isValid ? cleanedPhoneInfo.cleaned : (r.phone || ''),
                    formatted_phone: cleanedPhoneInfo.formatted,
                    phone_valid: cleanedPhoneInfo.isValid,
                    is_whatsapp: cleanedPhoneInfo.isWhatsapp
                };
            });

            for (const upd of toUpdate) {
                const { data: existingLead } = await supabase.from('leads').select('ai_enriched_data').eq('id', upd.id).single();
                const newEnrichedData = {
                    ...(existingLead?.ai_enriched_data || {}),
                    raw_phone: upd.phone,
                    phone_valid: upd.phone_valid,
                    formatted_phone: upd.formatted_phone,
                    is_whatsapp: upd.is_whatsapp
                };
                
                await supabase.from('leads').update({ 
                    phone: upd.phone,
                    ai_enriched_data: newEnrichedData
                }).eq('id', upd.id);
            }
        }
    } finally {
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
    }

    const fixed = allResults.filter(r => r.phone && !isPhoneBad(r.phone)).length;
    const failed = allResults.length - fixed;

    log(`\n✅ ALL DONE!`);
    log(`📞 Fixed: ${fixed} | ⚠️ Not found: ${failed} | 🗑️ Duplicates removed: ${duplicateIds.length}`);

    return { fixed, failed, deleted: duplicateIds.length, total: unique.length };
}

module.exports = { fixAllPhones, isPhoneBad };
