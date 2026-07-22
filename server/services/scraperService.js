const { chromium } = require('playwright');

/**
 * Enterprise Playwright Chromium Launch Configuration
 * Hardened for 100% production uptime across Windows, Linux, and Docker environments.
 */
async function launchHardenedBrowser() {
    return await chromium.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--disable-background-networking',
            '--disable-default-apps',
            '--disable-extensions',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--metrics-recording-only',
            '--mute-audio',
            '--safebrowsing-disable-auto-update'
        ]
    });
}

async function scrapeGoogleMaps(queries, maxResultsPerQuery = 20) {
    console.log(`[ScraperService] Starting Hardened Playwright Engine with ${queries.length} queries`);
    
    let browser = null;
    const allLeads = [];

    try {
        browser = await launchHardenedBrowser();
    } catch (launchErr) {
        console.error(`[ScraperService] First browser launch failed: ${launchErr.message}. Retrying in 1s...`);
        await new Promise(r => setTimeout(r, 1000));
        browser = await launchHardenedBrowser();
    }

    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 800 }
        });

        for (const query of queries) {
            console.log(`[ScraperService] Searching: "${query}"`);
            let page = null;

            try {
                page = await context.newPage();
                const cityHint = (query.match(/near\s+(.+)$/i) || query.match(/in\s+(.+)$/i) || [])[1]?.trim() || '';

                const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}/`;
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await page.waitForTimeout(2000);

                // Scroll results panel safely
                try {
                    for (let i = 0; i < 10; i++) {
                        await page.evaluate(() => {
                            const feed = document.querySelector('[role="feed"]');
                            if (feed) feed.scrollBy(0, 1500);
                        }).catch(() => {});
                        await page.waitForTimeout(350);
                    }
                } catch (scrollErr) {
                    console.warn(`[ScraperService] Scroll warning: ${scrollErr.message}`);
                }

                // Extract place links
                const placeLinks = await page.evaluate(() => {
                    const results = [];
                    const seen = new Set();
                    document.querySelectorAll('a[href*="/maps/place/"]').forEach(el => {
                        const href = el.href;
                        const title = el.getAttribute('aria-label') || el.textContent?.trim();
                        if (href && title && title.length > 1 && !seen.has(title)) {
                            seen.add(title);
                            results.push({ title: title.trim(), href });
                        }
                    });
                    return results;
                }).catch(() => []);

                console.log(`[ScraperService] Found ${placeLinks.length} raw place links for "${query}"`);
                const toProcess = placeLinks.slice(0, maxResultsPerQuery);

                const batchSize = 4; // 4 parallel detail tabs max to prevent memory spikes
                for (let i = 0; i < toProcess.length; i += batchSize) {
                    const batch = toProcess.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (place) => {
                        let detailPage = null;
                        try {
                            detailPage = await context.newPage();
                            await detailPage.goto(place.href, { waitUntil: 'domcontentloaded', timeout: 18000 });
                            await detailPage.waitForTimeout(1500);

                            const details = await detailPage.evaluate(() => {
                                let phone = '', website = '', address = '', category = '';
                                let rating = null;

                                const phoneBtn = document.querySelector('button[data-tooltip="Copy phone number"]');
                                if (phoneBtn) phone = (phoneBtn.getAttribute('aria-label') || '').replace(/^Phone(?:\s+number)?:\s*/i, '').trim();
                                
                                if (!phone) {
                                    const telBtn = document.querySelector('button[data-item-id^="phone:tel:"]');
                                    if (telBtn) phone = (telBtn.getAttribute('data-item-id') || '').replace('phone:tel:', '').trim();
                                }
                                if (!phone) {
                                    const telLink = document.querySelector('a[href^="tel:"]');
                                    if (telLink) phone = telLink.getAttribute('href').replace('tel:', '').trim();
                                }
                                if (!phone) {
                                    const allText = Array.from(document.querySelectorAll('span, div')).map(el => el.innerText || '').join('\n');
                                    const m = allText.match(/(?:\+91[\s\-]?)?0?[6-9]\d[\s\-]?\d{4}[\s\-]?\d{4,5}\b/);
                                    if (m) phone = m[0].trim();
                                }

                                const webBtn = document.querySelector('a[data-tooltip="Open website"]');
                                if (webBtn) website = webBtn.getAttribute('href') || '';

                                const addrBtn = document.querySelector('button[data-tooltip="Copy address"]');
                                if (addrBtn) address = (addrBtn.getAttribute('aria-label') || '').replace(/^Address:\s*/i, '').trim();

                                const ratingEl = document.querySelector('.ceNzKf[aria-hidden="true"]') || document.querySelector('span[aria-hidden="true"].ceNzKf');
                                if (ratingEl) rating = parseFloat(ratingEl.textContent) || null;

                                return { phone, website, address, category, rating };
                            }).catch(() => ({ phone: '', website: '', address: '', category: '', rating: null }));

                            let city = cityHint;
                            if (details.address) {
                                const parts = details.address.split(',');
                                if (parts.length >= 2) {
                                    const candidate = parts[parts.length - 2]?.trim().replace(/\s*\d+$/, '').trim();
                                    if (candidate && candidate.length > 2 && candidate.length < 40) city = candidate;
                                }
                            }

                            if (details.phone || details.website || place.title) {
                                allLeads.push({
                                    company_name: place.title,
                                    phone: details.phone || '',
                                    website: details.website || '',
                                    address: details.address || '',
                                    city: city,
                                    category: details.category || '',
                                    rating: details.rating,
                                    source: 'gmaps'
                                });
                            }
                        } catch (detailErr) {
                            console.log(`[ScraperService] Isolated detail page warning for "${place.title}": ${detailErr.message}`);
                        } finally {
                            if (detailPage) await detailPage.close().catch(() => {});
                        }
                    }));
                }

            } catch (queryErr) {
                console.error(`[ScraperService] Query execution error for "${query}": ${queryErr.message}`);
            } finally {
                if (page) await page.close().catch(() => {});
            }
        }

    } catch (globalScrapeErr) {
        console.error(`[ScraperService] Global scrape iteration error: ${globalScrapeErr.message}`);
    } finally {
        if (browser) await browser.close().catch(() => {});
    }

    console.log(`[ScraperService] Done. Total leads extracted: ${allLeads.length}`);
    return allLeads;
}

module.exports = { scrapeGoogleMaps };
