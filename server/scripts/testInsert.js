require('dotenv').config();
const supabase = require('../config/supabase');

async function test() {
  console.log('Testing Supabase insert...');
  
  // First, find or create a campaign to reference
  const { data: campaign, error: campError } = await supabase
    .from('campaigns')
    .select('id')
    .limit(1)
    .single();

  if (campError) {
    console.error('Error finding campaign:', campError);
    return;
  }

  const campaignId = campaign.id;
  console.log('Using campaign ID:', campaignId);

  const testLead = {
    campaign_id: campaignId,
    company_name: 'Test Business ' + Date.now(),
    phone: '9876543210',
    website: 'http://testbusiness.com',
    address: '123 Test Street, Nashik, Maharashtra 422001',
    city: 'Nashik',
    category: 'IT Dealers',
    rating: 4.5,
    reviews: 12,
    source: 'gmaps',
    ai_score: 80,
    quality_tier: 'High',
    ai_enriched_data: { type: 'B2B', reasoning: 'Test insertion' }
  };

  const { data, error } = await supabase
    .from('leads')
    .insert(testLead)
    .select();

  if (error) {
    console.error('❌ Insert failed:', error);
  } else {
    console.log('✅ Insert succeeded:', data);
    
    // Clean up
    const { error: delError } = await supabase
      .from('leads')
      .delete()
      .eq('id', data[0].id);
      
    if (delError) {
      console.error('Cleanup failed:', delError);
    } else {
      console.log('Cleaned up test lead successfully.');
    }
  }
}

test();
