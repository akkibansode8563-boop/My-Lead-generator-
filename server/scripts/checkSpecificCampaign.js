require('dotenv').config();
const supabase = require('../config/supabase');

async function test() {
  const id = '9eeb49fb-8037-432d-88ff-e008bbf44fdd';
  console.log('Querying campaign:', id);
  try {
    const { data: campaign, error } = await supabase.from('campaigns').select('*').eq('id', id).single();
    if (error) {
      console.error('Error fetching campaign:', error);
    } else {
      console.log('Campaign:', JSON.stringify(campaign, null, 2));
    }

    const { data: leads, error: leadErr } = await supabase.from('leads').select('id').eq('campaign_id', id);
    if (leadErr) {
      console.error('Error fetching leads:', leadErr);
    } else {
      console.log('Leads count in database for this campaign:', leads.length);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
