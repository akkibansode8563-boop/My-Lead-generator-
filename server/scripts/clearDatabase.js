require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTruncate() {
    console.log('Clearing all leads from Supabase...');
    
    // We can delete all leads where id > 0 or something, or delete by campaign_id
    // Wait, let's just delete everything to give a clean slate.
    // If table is small, we can just delete all rows.
    // Easiest is to select all IDs and delete them.
    const { data: leads, error } = await supabase.from('leads').select('id');
    
    if (error) {
        console.error('Error fetching leads:', error);
        return;
    }
    
    console.log(`Found ${leads.length} leads to delete.`);
    
    if (leads.length > 0) {
        const ids = leads.map(l => l.id);
        const { error: deleteError } = await supabase.from('leads').delete().in('id', ids);
        if (deleteError) {
            console.error('Failed to delete leads:', deleteError);
        } else {
            console.log('Successfully cleared all leads!');
        }
    } else {
        console.log('Database is already empty.');
    }
}

runTruncate();
