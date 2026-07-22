require('dotenv').config();
const scraperService = require('../services/scraperService');

async function test() {
  console.log('Testing scraper...');
  try {
    const results = await scraperService.scrapeGoogleMaps(['IT Dealers in Nashik'], 3);
    console.log('Scrape result length:', results.length);
    console.log('Results:', JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error running scraper:', error);
  }
}

test();
