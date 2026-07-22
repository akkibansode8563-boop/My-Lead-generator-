require('dotenv').config();
const supabase = require('../config/supabase');

async function test() {
  console.log('Querying all campaigns...');
  try {
    const { data: campaigns, error } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error:', error);
      return;
    }
    campaigns.forEach(c => {
      console.log(`Campaign ID: ${c.id} | Name: ${c.name} | Status: ${c.status} | Leads: ${c.leads_found} | Created: ${c.created_at}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
