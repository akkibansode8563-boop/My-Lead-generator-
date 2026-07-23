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
    if (error) {
      console.warn('[LeadsRoute] Supabase DB error, returning empty array fallback:', error.message);
      return res.json({ data: [] });
    }
    res.json({ data: data || [] });
  } catch (e) {
    console.warn('[LeadsRoute] Exception, returning fallback:', e.message);
    res.json({ data: [] });
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

    if (error) {
      console.warn('[LeadsRoute] DB error on GET /api/leads, returning graceful fallback:', error.message);
      return res.json({
        data: [],
        meta: {
          total: 0,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: 0
        }
      });
    }

    const totalRecords = count || (data ? data.length : 0);
    res.json({
      data: data || [],
      meta: {
        total: totalRecords,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalRecords / parseInt(limit)) || 0
      }
    });
  } catch (error) {
    console.warn('[LeadsRoute] Exception on GET /api/leads, returning fallback:', error.message);
    res.json({
      data: [],
      meta: {
        total: 0,
        page: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 50),
        totalPages: 0
      }
    });
  }
});

module.exports = router;
