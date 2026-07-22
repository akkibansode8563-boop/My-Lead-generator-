const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET /api/leads/campaigns — return all campaigns for the filter dropdown
router.get('/campaigns', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .select('id, name, created_at, status, leads_found, target_categories, target_regions')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ data });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/leads - Fetch leads with pagination & filtering
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      campaign_id,
      city,
      category,
      industry,
      quality_tier,
      search,
      sector,
      source,
      status
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' });

    // CAMPAIGN ISOLATION — show only leads from the selected campaign run
    if (campaign_id) query = query.eq('campaign_id', campaign_id);

    if (city)         query = query.ilike('city', `%${city}%`);
    if (category)     query = query.ilike('category', `%${category}%`);
    if (industry)     query = query.ilike('category', `%${industry}%`);
    if (quality_tier) query = query.eq('quality_tier', quality_tier);
    if (status)       query = query.eq('status', status);
    if (source)       query = query.eq('source', source);
    if (sector) {
      query = query.contains('ai_enriched_data', { type: sector });
    }
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,phone.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, count, error } = await query;

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      data,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
