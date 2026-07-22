require('dotenv').config();
const supabase = require('../config/supabase');

async function test() {
  console.log('Querying campaigns...');
  try {
    const { data: campaigns, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false }).limit(5);
    if (error) {
      console.error('Error fetching campaigns:', error);
      return;
    }
    console.log('Campaigns:', JSON.stringify(campaigns, null, 2));

    for (const c of campaigns) {
      const { data: leads, error: leadErr } = await supabase.from('leads').select('*').eq('campaign_id', c.id);
      if (leadErr) {
        console.error('Error fetching leads:', leadErr);
      } else {
        console.log(`Campaign ${c.id} (${c.name}): status=${c.status}, leadsCount=${leads.length}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
