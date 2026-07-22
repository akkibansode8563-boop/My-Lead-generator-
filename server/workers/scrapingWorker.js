const supabase = require('../config/supabase');
const scraperService = require('../services/scraperService');
const { enrichLeadWithAI } = require('../services/aiEnrichmentService');
const { cleanIndianPhone } = require('../utils/phoneUtils');
const masterEntityService = require('../services/masterEntityService');

async function runCampaignJob(jobData) {
  const { campaignId, targetRegions, targetCategories, state, city, marketArea, customerTypes, productCategories } = jobData;
  
  console.log(`[Worker] Starting intelligence job for campaign/scan: ${campaignId}`);

  // Initialize global jobs progress object
  global.campaignJobs = global.campaignJobs || {};
  global.campaignJobs[campaignId] = {
    status: 'Initializing',
    progress: 0,
    leadsCollected: 0,
    pagesProcessed: 0,
    totalPages: 0,
    eta: 'Calculating...',
    currentQuery: '',
    successCount: 0,
    failedCount: 0,
    duplicateCount: 0,
    exportStatus: 'Pending',
    startedAt: Date.now()
  };

  try {
    // 1. Mark campaign as running
    await supabase.from('campaigns').update({ status: 'running' }).eq('id', campaignId);
    global.campaignJobs[campaignId].status = 'Searching';
    global.campaignJobs[campaignId].progress = 5;

    // 2. Generate Search Queries (Geography + Customer Vertical + Category)
    const targetState = state || 'Maharashtra';
    const targetCity = city || (targetRegions && targetRegions[0]) || 'Nagpur';
    const targetMarket = marketArea || '';
    
    const cats = productCategories && productCategories.length > 0 ? productCategories : (targetCategories || ['IT Hardware']);
    const verticals = customerTypes && customerTypes.length > 0 ? customerTypes : ['IT Dealers'];
    
    const queries = [];
    verticals.slice(0, 5).forEach(vert => {
      cats.slice(0, 3).forEach(cat => {
        const locationPart = targetMarket ? `${targetMarket}, ${targetCity}` : targetCity;
        queries.push(`${vert} ${cat} near ${locationPart}`);
      });
    });

    // Fallback if no specific queries generated
    if (queries.length === 0) {
      queries.push(`IT Hardware Dealers near ${targetCity}`);
    }

    console.log(`[Worker] Generated ${queries.length} spatial search queries for ${targetCity}`);
    global.campaignJobs[campaignId].totalPages = queries.length;

    let savedCount = 0;
    global.campaignJobs[campaignId].status = 'Scraping';

    // 3. Scrape and process query-by-query
    for (let qIdx = 0; qIdx < queries.length; qIdx++) {
      const query = queries[qIdx];
      console.log(`[Worker] [Query ${qIdx + 1}/${queries.length}] Scraping: "${query}"`);

      // Update progress metrics
      global.campaignJobs[campaignId].currentQuery = query;
      global.campaignJobs[campaignId].pagesProcessed = qIdx + 1;
      
      const progressPct = Math.round(5 + (qIdx / queries.length) * 90);
      global.campaignJobs[campaignId].progress = progressPct;

      // Calculate ETA
      const elapsed = Date.now() - global.campaignJobs[campaignId].startedAt;
      if (qIdx > 0) {
        const avgTimePerQuery = elapsed / qIdx;
        const remainingQueries = queries.length - qIdx;
        const remainingMs = remainingQueries * avgTimePerQuery;
        const seconds = Math.floor(remainingMs / 1000);
        if (seconds < 60) {
          global.campaignJobs[campaignId].eta = `${seconds}s`;
        } else {
          global.campaignJobs[campaignId].eta = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        }
      } else {
        const remainingQueries = queries.length;
        const remainingMs = remainingQueries * 20000;
        const seconds = Math.floor(remainingMs / 1000);
        if (seconds < 60) {
          global.campaignJobs[campaignId].eta = `${seconds}s`;
        } else {
          global.campaignJobs[campaignId].eta = `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        }
      }

      const gmapsResults = await scraperService.scrapeGoogleMaps([query], 30).catch(err => {
        console.error(`[Worker] Google Maps query failed for "${query}":`, err.message);
        global.campaignJobs[campaignId].failedCount++;
        return [];
      });

      console.log(`[Worker] Query "${query}" returned ${gmapsResults.length} raw results`);

      for (const item of gmapsResults) {
        const name = (item.company_name || 'Unknown').trim();
        const rawPhone = item.phone || '';
        const phoneInfo = cleanIndianPhone(rawPhone);

        // Build lead record payload
        const leadRecord = {
          campaign_id: campaignId,
          company_name: name,
          phone: phoneInfo.isValid ? phoneInfo.cleaned : rawPhone,
          website: item.website || '',
          address: item.address || '',
          city: item.city || targetCity,
          state: targetState,
          market_area: targetMarket,
          category: item.category || verticals[0] || 'IT Dealers',
          rating: item.rating || null,
          reviews: item.reviews || null,
          source: item.source || 'gmaps',
          ai_score: 50,
          quality_tier: 'Medium',
          ai_enriched_data: {
            type: 'B2B',
            raw_phone: rawPhone,
            phone_valid: phoneInfo.isValid,
            formatted_phone: phoneInfo.formatted,
            is_whatsapp: phoneInfo.isWhatsapp
          }
        };

        if (!phoneInfo.isValid) {
          leadRecord.ai_score = 30;
          leadRecord.quality_tier = 'Low';
          leadRecord.ai_enriched_data.reasoning = 'Missing or invalid phone number';
          global.campaignJobs[campaignId].failedCount++;
        }

        // AI enrichment (non-blocking)
        try {
          const enriched = await enrichLeadWithAI(leadRecord);
          if (phoneInfo.isValid) {
            leadRecord.ai_score = enriched.ai_score;
            leadRecord.quality_tier = enriched.quality_tier;
            leadRecord.ai_enriched_data = {
              ...leadRecord.ai_enriched_data,
              ...enriched.ai_enriched_data
            };
          }
        } catch (aiErr) {
          console.warn(`[Worker] AI enrichment skipped for "${name}": ${aiErr.message}`);
        }

        // Process through Master Entity Resolution Engine (Multi-Pass Deduplication & Master Upsert)
        try {
          const result = await masterEntityService.processMasterBusinessRecord(leadRecord, {
            campaignId,
            state: targetState,
            city: targetCity,
            market_area: targetMarket,
            customerType: verticals[0],
            productCategory: cats[0]
          });

          if (result.isMerged) {
            global.campaignJobs[campaignId].duplicateCount++;
          }

          savedCount++;
          global.campaignJobs[campaignId].successCount = savedCount;
          global.campaignJobs[campaignId].leadsCollected = savedCount;

          // Update campaign counter in DB immediately
          await supabase.from('campaigns').update({ leads_found: savedCount }).eq('id', campaignId);

          if (savedCount >= 500) {
            console.log(`[Worker] Target threshold (500 leads) reached early.`);
            break;
          }
        } catch (masterErr) {
          console.error(`[Worker] Master resolution error for "${name}":`, masterErr.message);
          global.campaignJobs[campaignId].failedCount++;
        }
      }
      if (savedCount >= 500) {
        break;
      }
    }

    // 5. Final campaign update
    await supabase.from('campaigns').update({ 
      status: 'completed',
      leads_found: savedCount
    }).eq('id', campaignId);
    
    global.campaignJobs[campaignId].status = 'Exporting';
    global.campaignJobs[campaignId].progress = 100;
    global.campaignJobs[campaignId].eta = '0s';
    
    console.log(`[Worker] ✅ Job complete for campaign ${campaignId}. Saved ${savedCount} leads.`);

  } catch (error) {
    console.error(`[Worker] Job failed:`, error);
    await supabase.from('campaigns').update({ 
      status: 'failed',
      error_message: error.message 
    }).eq('id', campaignId);

    if (global.campaignJobs[campaignId]) {
      global.campaignJobs[campaignId].status = 'Failed';
      global.campaignJobs[campaignId].progress = 100;
      global.campaignJobs[campaignId].eta = '0s';
    }
  }
}

console.log('👷 In-Memory Scraping Worker Ready (with GMaps, IndiaMART, and AI Enrichment)');

module.exports = { runCampaignJob };
