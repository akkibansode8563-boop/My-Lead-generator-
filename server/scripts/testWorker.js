require('dotenv').config();
const supabase = require('../config/supabase');
const { runCampaignJob } = require('../workers/scrapingWorker');

async function test() {
  console.log('Creating a test campaign...');
  
  // 1. Create a campaign
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .insert([
      { 
        name: 'Test Campaign: Nashik', 
        target_regions: ['Nashik'], 
        target_categories: ['IT Dealers', 'Laptop Dealers'], 
        status: 'pending' 
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    return;
  }

  console.log('Created campaign:', campaign.id);
  console.log('Triggering worker job in background (saving query-by-query)...');

  // We await this to see the execution in console
  await runCampaignJob({
    campaignId: campaign.id,
    targetRegions: campaign.target_regions,
    targetCategories: campaign.target_categories
  });

  console.log('Worker execution completed. Fetching leads saved for this campaign...');
  const { data: leads, error: leadErr } = await supabase
    .from('leads')
    .select('*')
    .eq('campaign_id', campaign.id);

  if (leadErr) {
    console.error('Error fetching leads:', leadErr);
  } else {
    console.log(`Saved leads count for campaign ${campaign.id}:`, leads.length);
    console.log('Sample Lead:', JSON.stringify(leads[0], null, 2));
  }
}

test();
