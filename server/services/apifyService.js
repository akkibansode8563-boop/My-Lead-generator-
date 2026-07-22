const { ApifyClient } = require('apify-client');
const { cleanIndianPhone } = require('../utils/phoneUtils');

async function scrapeApify(queries, maxResultsPerQuery = 10) {
    if (!process.env.APIFY_API_TOKEN) {
        console.log('[ApifyService] Skipping Apify because APIFY_API_TOKEN is not set.');
        return [];
    }

    console.log(`[ApifyService] Starting Apify scraper for ${queries.length} queries`);
    const client = new ApifyClient({
        token: process.env.APIFY_API_TOKEN,
    });

    const allLeads = [];

    // We can run the queries in a single actor run by passing them as an array
    const actorInput = {
        searchStringsArray: queries,
        maxCrawledPlacesPerSearch: maxResultsPerQuery,
        language: 'en',
        includeReviews: false,
        includeImages: false,
        includeOpeningHours: false,
        maxImages: 0,
        maxReviews: 0,
    };

    try {
        console.log(`[ApifyService] Calling compass/crawler-google-places...`);
        const run = await client.actor('compass/crawler-google-places').call(actorInput);

        console.log(`[ApifyService] Run finished. Fetching dataset ${run.defaultDatasetId}...`);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        for (const item of items) {
            const rawPhone = item.phoneUnformatted || item.phone || '';
            const phoneData = cleanIndianPhone(rawPhone);
            
            allLeads.push({
                company_name: item.title,
                phone: phoneData.cleaned,
                phone_valid: phoneData.isValid,
                formatted_phone: phoneData.formatted,
                website: item.website || '',
                address: item.address || '',
                city: item.city || '',
                category: item.categoryName || '',
                rating: item.totalScore || null,
                reviews: item.reviewsCount || null,
                source: 'apify'
            });
        }
        
        console.log(`[ApifyService] Apify found ${allLeads.length} leads.`);
        return allLeads;
    } catch (error) {
        console.error(`[ApifyService] Apify failed:`, error.message);
        return [];
    }
}

module.exports = {
    scrapeApify
};
