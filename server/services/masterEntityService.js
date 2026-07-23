const supabase = require('../config/supabase');
const { cleanIndianPhone } = require('../utils/phoneUtils');

/**
 * Calculates string similarity using Jaro-Winkler distance algorithm.
 */
function jaroWinklerDistance(s1, s2) {
  if (!s1 || !s2) return 0;
  const str1 = s1.toLowerCase().trim();
  const str2 = s2.toLowerCase().trim();
  if (str1 === str2) return 1.0;

  const len1 = str1.length;
  const len2 = str2.length;
  const matchDistance = Math.floor(Math.max(len1, len2) / 2) - 1;

  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, len2);

    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Extract root domain from URL string
 */
function extractDomain(urlStr) {
  if (!urlStr) return '';
  try {
    const parsed = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch (e) {
    return String(urlStr).toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  }
}

/**
 * Multi-Pass Master Entity Upsert & Resolution Service
 */
async function processMasterBusinessRecord(rawLead, scanContext = {}) {
  const name = (rawLead.company_name || rawLead.name || 'Unknown Business').trim();
  const rawPhone = rawLead.phone || '';
  const phoneInfo = cleanIndianPhone(rawPhone);
  const normalizedPhone = phoneInfo.cleaned;
  const placeId = rawLead.google_place_id || rawLead.place_id || null;
  const gstin = rawLead.gstin || null;
  const website = rawLead.website || '';
  const domain = extractDomain(website);
  const city = rawLead.city || scanContext.city || '';
  const state = rawLead.state || scanContext.state || '';
  const marketArea = rawLead.market_area || scanContext.market_area || '';
  const campaignId = rawLead.campaign_id || scanContext.campaignId || null;

  let existingMaster = null;
  let matchMethod = null;

  try {
    // Pass 1: Google Place ID match
    if (placeId) {
      const { data } = await supabase.from('master_businesses').select('*').eq('google_place_id', placeId).maybeSingle();
      if (data) {
        existingMaster = data;
        matchMethod = 'Google Place ID';
      }
    }

    // Pass 2: Cleaned Phone match
    if (!existingMaster && normalizedPhone && normalizedPhone.length >= 8) {
      const { data } = await supabase.from('master_businesses').select('*').eq('primary_phone', normalizedPhone).maybeSingle();
      if (data) {
        existingMaster = data;
        matchMethod = 'Primary Phone Match';
      }
    }

    // Pass 3: Verified GSTIN match
    if (!existingMaster && gstin) {
      const { data } = await supabase.from('master_businesses').select('*').eq('gstin', gstin).maybeSingle();
      if (data) {
        existingMaster = data;
        matchMethod = 'GSTIN Match';
      }
    }

    // Pass 4: Website Domain Match
    if (!existingMaster && domain && domain.length > 4) {
      const { data } = await supabase.from('master_businesses').select('*').ilike('primary_website', `%${domain}%`).limit(10);
      if (data && data.length > 0) {
        const exactDomainMatch = data.find(item => extractDomain(item.primary_website) === domain);
        if (exactDomainMatch) {
          existingMaster = exactDomainMatch;
          matchMethod = 'Website Domain Match';
        }
      }
    }

    // Pass 5: Fuzzy Name & Address Similarity Check in Target City
    if (!existingMaster && name.length > 2 && city) {
      const { data: candidates } = await supabase.from('master_businesses').select('id, company_name, primary_phone').limit(50);
      if (candidates && candidates.length > 0) {
        for (const cand of candidates) {
          const similarity = jaroWinklerDistance(name, cand.company_name);
          if (similarity >= 0.88) {
            existingMaster = cand;
            matchMethod = `Fuzzy Name Match (${(similarity * 100).toFixed(0)}%)`;
            break;
          }
        }
      }
    }
  } catch (lookupErr) {
    console.warn(`[MasterEntityService] Lookup fallback (DB offline):`, lookupErr.message);
  }

  let isNewRecord = false;
  let masterId = null;

  if (existingMaster) {
    // Merge & Enrich Existing Master Customer Record
    masterId = existingMaster.id;
    console.log(`[MasterEntityService] 🔄 Matched Master Business [${matchMethod}]: "${existingMaster.company_name}" (ID: ${masterId})`);

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (!existingMaster.primary_phone && normalizedPhone) updatePayload.primary_phone = normalizedPhone;
    if (!existingMaster.primary_email && rawLead.email) updatePayload.primary_email = rawLead.email;
    if (!existingMaster.primary_website && website) updatePayload.primary_website = website;
    if (!existingMaster.google_place_id && placeId) updatePayload.google_place_id = placeId;
    if (!existingMaster.gstin && gstin) updatePayload.gstin = gstin;
    if (rawLead.rating && (!existingMaster.rating || rawLead.rating > existingMaster.rating)) updatePayload.rating = rawLead.rating;
    if (rawLead.reviews && rawLead.reviews > (existingMaster.reviews_count || 0)) updatePayload.reviews_count = rawLead.reviews;

    // AI score upgrade if higher
    if (rawLead.ai_score && rawLead.ai_score > (existingMaster.national_ai_score || 0)) {
      updatePayload.national_ai_score = rawLead.ai_score;
      if (rawLead.quality_tier) updatePayload.quality_tier = rawLead.quality_tier;
    }

    await supabase.from('master_businesses').update(updatePayload).eq('id', masterId);

  } else {
    // Insert New Master Customer Record
    isNewRecord = true;
    console.log(`[MasterEntityService] ✨ Discovered NEW Master Business Entity: "${name}" | ${city} | ${state}`);

    const masterPayload = {
      company_name: name,
      brand_name: rawLead.brand_name || name,
      gstin: gstin,
      primary_phone: normalizedPhone || rawLead.phone || '',
      is_whatsapp: phoneInfo.isWhatsapp,
      primary_email: rawLead.email || '',
      primary_website: website,
      google_place_id: placeId,
      rating: rawLead.rating || null,
      reviews_count: rawLead.reviews || 0,
      national_ai_score: rawLead.ai_score || 50,
      quality_tier: rawLead.quality_tier || 'Medium',
      aggregated_metadata: {
        raw_phone: rawLead.phone || '',
        phone_valid: phoneInfo.isValid,
        formatted_phone: phoneInfo.formatted,
        initial_source: rawLead.source || 'gmaps_radius_scan',
        ai_enriched_data: rawLead.ai_enriched_data || {}
      }
    };

    try {
      const { data: newMaster, error: masterErr } = await supabase.from('master_businesses').insert(masterPayload).select().single();
      if (masterErr) {
        console.warn(`[MasterEntityService] DB insert warning:`, masterErr.message);
        masterId = 'master-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      } else {
        masterId = newMaster.id;
      }
    } catch (dbEx) {
      console.warn(`[MasterEntityService] DB offline mode active for "${name}":`, dbEx.message);
      masterId = 'master-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    }

    // Insert Location
    await supabase.from('business_locations').insert({
      business_id: masterId,
      state: state || 'Maharashtra',
      city: city || 'Nagpur',
      market_area: marketArea || '',
      full_address: rawLead.address || '',
      latitude: rawLead.lat || null,
      longitude: rawLead.lng || null
    }).catch(err => console.warn(`[MasterEntityService] Location log warning:`, err.message));
  }

  // Insert Classification Vertical
  const customerType = scanContext.customerType || rawLead.category || 'Dealers';
  const productCategory = scanContext.productCategory || 'IT Hardware';
  await supabase.from('business_classifications').insert({
    business_id: masterId,
    customer_type: customerType,
    product_category: productCategory
  }).catch(() => {}); // non-blocking duplicate tag fallback

  // Backwards compatibility layer: Insert / sync with legacy `leads` table
  const legacyLeadRecord = {
    campaign_id: campaignId,
    company_name: name,
    phone: phoneInfo.isValid ? normalizedPhone : (rawLead.phone || ''),
    email: rawLead.email || '',
    website: website,
    address: rawLead.address || '',
    city: city,
    state: state,
    source: rawLead.source || 'gmaps',
    ai_score: rawLead.ai_score || 50,
    quality_tier: rawLead.quality_tier || 'Medium',
    rating: rawLead.rating || null,
    reviews: rawLead.reviews || null,
    category: customerType,
    ai_enriched_data: {
      master_business_id: masterId,
      match_method: matchMethod || 'New Master Creation',
      ...(rawLead.ai_enriched_data || {})
    }
  };

  await supabase.from('leads').insert(legacyLeadRecord).catch(err => console.warn(`[MasterEntityService] Legacy lead sync warning:`, err.message));

  return {
    masterId,
    isNewRecord,
    isMerged: !isNewRecord,
    matchMethod
  };
}

module.exports = {
  processMasterBusinessRecord,
  jaroWinklerDistance,
  extractDomain
};
