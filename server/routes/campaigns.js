const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { runCampaignJob } = require('../workers/scrapingWorker'); // Import the worker function directly

// POST /api/campaigns - Create a new scraping / intelligence scan job
router.post('/', async (req, res) => {
  try {
    const {
      name,
      target_regions,
      target_categories,
      state,
      city,
      market_area,
      radius_km,
      customer_types,
      product_categories
    } = req.body;

    const targetCity = city || (target_regions && target_regions[0]) || 'Nagpur';
    const targetState = state || 'Maharashtra';
    const targetMarket = market_area || '';
    const campaignName = name || `Intelligence Scan: ${targetCity}${targetMarket ? ' (' + targetMarket + ')' : ''}`;
    
    // 1. Insert campaign / scan record into DB
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert([
        { 
          name: campaignName, 
          target_regions: target_regions || [targetCity], 
          target_categories: target_categories || product_categories || ['IT Hardware'], 
          status: 'pending' 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return res.status(500).json({ error: error.message });
    }

    // 2. Start background intelligence scan worker
    runCampaignJob({
      campaignId: campaign.id,
      targetRegions: target_regions || [targetCity],
      targetCategories: target_categories || product_categories || ['IT Hardware'],
      state: targetState,
      city: targetCity,
      marketArea: targetMarket,
      radiusKm: radius_km || 5.0,
      customerTypes: customer_types || ['IT Dealers'],
      productCategories: product_categories || target_categories || ['IT Hardware']
    }).catch(console.error);

    res.status(201).json({ message: 'Intelligence scan created and started in background', campaign });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campaigns - List campaigns
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campaigns/:id - Get a specific campaign
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/campaigns/:id/progress - Get live scraping progress for a campaign
router.get('/:id/progress', async (req, res) => {
  try {
    const campaignId = req.params.id;
    global.campaignJobs = global.campaignJobs || {};
    
    // Check if the job is active in-memory
    if (global.campaignJobs[campaignId]) {
      return res.json(global.campaignJobs[campaignId]);
    }

    // Fallback: Check the database to see if it's completed or failed
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Return a static completed or failed state
    const isCompleted = campaign.status === 'completed';
    const isFailed = campaign.status === 'failed';
    
    return res.json({
      status: campaign.status,
      progress: isCompleted ? 100 : (isFailed ? 100 : 0),
      leadsCollected: campaign.leads_found || 0,
      pagesProcessed: isCompleted ? 1 : 0,
      totalPages: isCompleted ? 1 : 0,
      eta: '0s',
      currentQuery: isCompleted ? 'Completed' : '',
      successCount: campaign.leads_found || 0,
      failedCount: isFailed ? 1 : 0,
      duplicateCount: 0,
      exportStatus: isCompleted ? 'Success' : 'Pending',
      startedAt: campaign.created_at
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
